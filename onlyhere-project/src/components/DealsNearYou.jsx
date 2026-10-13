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
// being listed here counts as "shown", and a visitor arriving through "Walk
// there" counts as "came".
import { useEffect, useMemo, useRef, useState } from "react";
import { C } from "../utils/theme";
import { t as uiT } from "../utils/uiLanguage";
import { promoCard } from "../utils/promotions";
import { NOW_AREAS, inNowArea, walkMinutes } from "../utils/nowPlanner";
import { cleanBooking, busyAt } from "../utils/dealExtras";
import { dealsSeen, placeReached } from "../utils/partnerStats";
import { WalkMode, askForCompass } from "./WalkMode";
import { DealCornerMap } from "./DealCornerMap";

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

export const DealsNearYou = ({ deals = [], examples = false, lang = "en", country = "LT", sticky = true }) => {
  const [here, setHere] = useState(null);
  const [note, setNote] = useState("");
  const [going, setGoing] = useState(null);
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
            return (
              <div key={x.id || x.d.name} data-testid="deal-near" style={{ background: on ? `${C.gold}12` : C.surface, border: `1px solid ${on ? `${C.gold}66` : C.border}`, borderRadius: 14, padding: "13px 15px" }}>
                {/* A fixed close map of where the place is, in the corner (13 Oct 2026). */}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Fraunces', serif", color: C.text, overflowWrap: "anywhere" }}>{x.d.name}</div>
                    {x.minutes != null && <div data-testid="deal-near-minutes" style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginTop: 1 }}>{fill(uiT("trips.walkMin", lang), { n: x.minutes })}</div>}
                    {offer && <div data-testid="deal-near-offer" style={{ fontSize: 14, fontWeight: 700, color: C.gold, lineHeight: 1.45, marginTop: 4 }}>{offer}</div>}
                    <div style={{ fontSize: 12, color: C.light, marginTop: 4 }}>
                      {x.card.hours ? <span style={{ fontWeight: on ? 700 : 400 }}>{on ? "● " : ""}{x.card.hours}</span> : <span style={{ fontWeight: 700 }}>● {uiT("trips.onNow", lang)}</span>}
                      {busy ? ` · ${uiT(`busy.${busy.level}`, lang)}` : ""}
                    </div>
                  </div>
                  {x.at && (
                    <DealCornerMap lat={x.at.lat} lon={x.at.lon} name={x.d.name}
                      onTap={() => go(x)} />
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {x.at && (
                    <button onClick={() => go(x)} data-testid="deal-near-go"
                      style={{ background: C.gold, color: C.onGold, border: "none", borderRadius: 100, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                      ▶ {uiT("trips.go", lang)}
                    </button>
                  )}
                  {book && (
                    <a href={book.href} target={book.kind === "web" ? "_blank" : undefined} rel="noopener noreferrer"
                      style={{ border: `1px solid ${C.border}`, color: C.light, borderRadius: 100, padding: "6px 13px", fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
                      {uiT("deal.book", lang)}
                    </a>
                  )}
                </div>
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

      {going && walkStart && (
        <WalkMode walk={walkToDeal(walkStart, going)} madeAt={null} lang={lang} country={country} loop={false}
          cardFor={() => ({ emoji: "◈", ...(going.d.photo ? { photo: going.d.photo } : {}) })}
          onReach={(s) => placeReached(s, country)} onClose={() => setGoing(null)} />
      )}
    </section>
  );
};

export default DealsNearYou;
