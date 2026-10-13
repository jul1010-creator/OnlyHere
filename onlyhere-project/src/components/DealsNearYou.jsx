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
import { C } from "../utils/theme";
import { t as uiT } from "../utils/uiLanguage";
import { promoCard } from "../utils/promotions";
import { NOW_AREAS, inNowArea, walkMinutes } from "../utils/nowPlanner";
import { cleanBooking, busyAt } from "../utils/dealExtras";
import { dealsSeen, placeReached, dealRedeemOpened } from "../utils/partnerStats";
import { WalkMode, askForCompass } from "./WalkMode";
import { DealCornerMap } from "./DealCornerMap";
import { DealPlaceView } from "./DealPlaceView";
import { placeClock, cleanClock } from "../utils/offerClock";
import { RedeemSheet } from "./RedeemSheet";

const fill = (t, v) => String(t).replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ""));

// A deal's place as the walk names it, `${type}:${row id}`, so a partner's
// numbers from this list and from the walks land on the same key. The live
// rows do not carry their database type, so it is read off the pool they came
// from; the made-up partners carry their own id.
export const SRC_TYPE = { free: "free", food: "food", nightlife: "night", shop: "shop", town: "town" };
export const dealPlaceId = (d) => {
  if (d?._exampleId) return String(d._exampleId);
  const type = SRC_TYPE[d?._src];
  return type && d?.id != null && d.id !== "" ? `${type}:${d.id}` : "";
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
// ORDER, 13 Oct 2026: "Make alphabetic and closest filter. And only calculate
// from you." So two orders a visitor picks, and distance only ever from where
// the phone is. "default" is the order the page used before he chose these,
// kept for the walk-free callers and the suite.
const nameOrder = (a, b) => String(a.d.name).localeCompare(String(b.d.name), "lt", { sensitivity: "base" });
export const nearbyDeals = (deals, start, { now = new Date(), lang = "en", limit = MAX_DEALS, order = "default" } = {}) =>
  (Array.isArray(deals) ? deals : [])
    .map(d => {
      const card = promoCard(d, { today: now, lang });
      const at = pointOf(d);
      return { d, card, at, id: dealPlaceId(d), minutes: at && start ? walkMinutes(start, at) : null };
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
export const walkToDeal = (start, x) => ({
  start: { ...start },
  stops: [{ id: x.id || `deal:${x.d.name}`, name: x.d.name, lat: x.at.lat, lon: x.at.lon, arrive: x.minutes, stay: STAY_AT_DEAL, why: String(x.d.__offer?.text || "").trim(), deal: { text: String(x.d.__offer?.text || "").trim() } }],
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
  const date = offerUntilWords(offer?.until, lang);
  if (date) return { kind: "until", text: say("offer.validUntil", { date }) };
  return null;
};
// The sign in the map pointer's window: the place's own, or its filter's.
export const KIND_SIGN = { discounts: "🏷️", entertainment: "🎵", activities: "🎯", other: "📍" };
export const signFor = (d) => (d?.emoji ? String(d.emoji) : KIND_SIGN[dealKind(d)] || "📍");

export const DealsNearYou = ({ deals = [], examples = false, lang = "en", country = "LT", sticky = true }) => {
  const [here, setHere] = useState(null);
  const [note, setNote] = useState("");
  const [going, setGoing] = useState(null);
  // The card whose map was tapped open: the place from above, with Show
  // directions under it (DealPlaceView.jsx, 13 Oct 2026). One at a time.
  const [opened, setOpened] = useState(null);
  // The offer opened to redeem: the screen shown at the counter
  // (RedeemSheet.jsx, 13 Oct 2026), with Gemlyx on it.
  const [redeem, setRedeem] = useState(null);
  // The countdown moves on by itself while the page is open.
  const [, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 30000); return () => clearInterval(t); }, []);
  const [kind, setKind] = useState(null);
  const [sort, setSort] = useState("az");
  const canLocate = typeof navigator !== "undefined" && !!navigator.geolocation && !!NOW_AREAS[country];
  // Distance only ever from the visitor (13 Oct 2026). No ship, no centre.
  const start = here ? { id: "here", name: uiT("now.whereYouAre", lang), lat: here.lat, lon: here.lon, ship: false } : null;
  const locate = (then = null) => {
    setNote("");
    if (!canLocate) { setNote(uiT("now.noLocation", lang)); return; }
    try {
      navigator.geolocation.getCurrentPosition((p) => {
        const at = { lat: p.coords.latitude, lon: p.coords.longitude };
        if (!inNowArea(country, at)) { setNote(uiT("now.notHere", lang)); return; }
        setHere(at);
        if (then) then(at);
      }, () => { setNote(uiT("explore.needLocation", lang)); setSort("az"); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 });
    } catch { setNote(uiT("now.noLocation", lang)); }
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
  const all = useMemo(() => nearbyDeals(deals, start, { now: new Date(), lang, limit: Infinity, order: sort === "closest" && start ? "closest" : "az" }), [deals, start?.lat, start?.lon, lang, sort]);
  const list = useMemo(() => (kind ? all.filter(x => dealKind(x.d) === kind) : all).slice(0, MAX_DEALS), [all, kind]);
  const go = (x) => {
    askForCompass();
    if (start) { setGoing(x); return; }
    locate((at) => setGoing({ ...x, minutes: walkMinutes(at, x.at), _from: at }));
  };
  const openRedeem = (x, when) => {
    setRedeem({ x, when: when?.text || "" });
    dealRedeemOpened(x.id, country);
  };
  const walkStart = going?._from ? { id: "here", name: uiT("now.whereYouAre", lang), lat: going._from.lat, lon: going._from.lon, ship: false } : start;

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
  const FILTERS = [[null, "explore.all"], ...DEAL_KINDS.map(k => [k, `explore.${k}`])];

  return (
    <section data-testid="deals-near" style={{ marginBottom: 30 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "0 0 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.2, margin: 0 }}>{uiT("trips.dealsH", lang)}</h2>
          {examples && <span data-testid="deals-near-examples" style={{ fontSize: 10, fontWeight: 700, color: C.text, border: `1px solid ${C.border}`, borderRadius: 100, padding: "2px 8px", letterSpacing: 0.4 }}>{uiT("deals.example", lang)}</span>}
        </div>
      </div>

      <div style={{ background: C.bg, padding: "6px 0 8px", marginBottom: 8, ...(sticky ? { position: "sticky", top: 0, zIndex: 20 } : {}) }}>
        <div data-testid="deals-filters" role="tablist" style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 8 }}>
          {FILTERS.map(([k, label]) => (
            <button key={label} role="tab" aria-selected={kind === k} onClick={() => setKind(k)} style={pill(kind === k)} data-testid={`deals-filter-${k || "all"}`}>
              {uiT(label, lang)}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Sort" data-testid="deals-sort" style={{ display: "inline-flex", gap: 2, background: `${C.border}55`, borderRadius: 100, padding: 2 }}>
          {SORTS.map(k => (
            <button key={k} onClick={() => pickSort(k)} aria-pressed={sort === k} style={seg(sort === k)} data-testid={`deals-sort-${k}`}>
              {uiT(`explore.${k}`, lang)}
            </button>
          ))}
        </div>
      </div>
      {note && <div data-testid="deals-near-note" style={{ fontSize: 12, color: "#FFB347", margin: "0 0 10px" }}>{note}</div>}
      {list.length === 0 ? (
        <div data-testid="deals-near-none" style={{ fontSize: 13.5, color: C.light, lineHeight: 1.6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "13px 15px" }}>
          {uiT(kind && all.length ? "explore.noneHere" : "trips.noDeals", lang)}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {list.map(x => {
            const busy = busyAt(x.d.__busy, new Date(), "Europe/Vilnius");
            const book = cleanBooking(x.d.__booking);
            const on = x.card.timing !== "later";
            const offer = String(x.d.__offer?.text || "").trim();
            const when = offerWhen(x.d.__offer, x.card.timing, { now: new Date(), lang });
            return (
              <div key={x.id || x.d.name} data-testid="deal-near" style={{ background: on ? `${C.gold}12` : C.surface, border: `1px solid ${on ? `${C.gold}66` : C.border}`, borderRadius: 14, padding: "13px 15px" }}>
                {/* A fixed close map of where the place is, in the corner (13 Oct 2026). */}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, overflowWrap: "anywhere" }}>{x.d.name}</div>
                    {x.minutes != null && <div data-testid="deal-near-minutes" style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginTop: 1 }}>{fill(uiT("trips.walkMin", lang), { n: x.minutes })}</div>}
                    {offer && <div data-testid="deal-near-offer" style={{ fontSize: 14, fontWeight: 700, color: C.gold, lineHeight: 1.45, marginTop: 4 }}>{offer}</div>}
                    <div style={{ fontSize: 12, color: C.light, marginTop: 4 }}>
                      {when?.kind === "ends" && <span data-testid="deal-near-ends" style={{ fontWeight: 800, color: when.left <= 30 ? "#FFB347" : C.gold }}>● {when.text}</span>}
                      {when && when.kind !== "ends" && <span data-testid="deal-near-when" style={{ fontWeight: on ? 700 : 400 }}>{when.text}</span>}
                      {busy ? `${when ? " · " : ""}${uiT(`busy.${busy.level}`, lang)}` : ""}
                    </div>
                  </div>
                  {x.at && (
                    <DealCornerMap lat={x.at.lat} lon={x.at.lon} name={x.d.name} sign={signFor(x.d)} photo={x.d.photo || ""}
                      onTap={() => setOpened(cur => (cur === (x.id || x.d.name) ? null : (x.id || x.d.name)))} />
                  )}
                </div>
                {opened === (x.id || x.d.name) && x.at && (
                  <DealPlaceView lat={x.at.lat} lon={x.at.lon} name={x.d.name} sign={signFor(x.d)} photo={x.d.photo || ""} lang={lang}
                    onDirections={() => go(x)} onClose={() => setOpened(null)} />
                )}
                {opened !== (x.id || x.d.name) && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {offer && on && (
                    <button onClick={() => openRedeem(x, when)} data-testid="deal-near-redeem"
                      style={{ background: C.gold, color: C.onGold, border: "none", borderRadius: 100, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                      {uiT("offer.redeem", lang)}
                    </button>
                  )}
                  {book && (
                    <a href={book.href} target={book.kind === "web" ? "_blank" : undefined} rel="noopener noreferrer"
                      style={{ border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "6px 13px", fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
                      {uiT("deal.book", lang)}
                    </a>
                  )}
                </div>}
              </div>
            );
          })}
        </div>
      )}
      {country === "LT" && (
        <a href={centreSite(lang)} target="_blank" rel="noopener noreferrer" data-testid="deals-centre-link"
          style={{ display: "block", marginTop: 14, fontSize: 12.5, fontWeight: 700, color: C.muted, textDecoration: "none", textAlign: "center" }}>
          {uiT("explore.more", lang)} ↗
        </a>
      )}

      {redeem && (
        <RedeemSheet name={redeem.x.d.name} offer={String(redeem.x.d.__offer?.text || "").trim()} when={redeem.when} lang={lang}
          onDirections={redeem.x.at ? () => { const x = redeem.x; setRedeem(null); go(x); } : null}
          onClose={() => setRedeem(null)} />
      )}
      {going && walkStart && (
        <WalkMode walk={walkToDeal(walkStart, going)} madeAt={null} lang={lang} country={country} loop={false}
          cardFor={() => ({ emoji: "◈", ...(going.d.photo ? { photo: going.d.photo } : {}) })}
          onReach={(s) => placeReached(s, country)} onClose={() => setGoing(null)} />
      )}
    </section>
  );
};

export default DealsNearYou;
