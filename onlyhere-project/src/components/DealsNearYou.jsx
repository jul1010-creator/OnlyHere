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
import { NOW_STARTS, NOW_AREAS, inNowArea, walkMinutes } from "../utils/nowPlanner";
import { cleanBooking, busyAt } from "../utils/dealExtras";
import { dealsSeen, placeReached } from "../utils/partnerStats";
import { WalkMode, askForCompass } from "./WalkMode";
import { DealCornerMap } from "./DealCornerMap";

// The map credit is the tile provider's condition (utils/mapTiles.js), so it
// stays on the corner maps too, set small enough to fit a thumbnail.
const CORNER_MAP_CSS = ".gemlyx-deal-map .leaflet-control-attribution{font-size:7px;line-height:1.25;padding:0 3px;background:rgba(10,15,30,.72);color:#8A93A8;white-space:normal;max-width:100%}.gemlyx-deal-map .leaflet-control-attribution a{color:#8A93A8}";

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
export const nearbyDeals = (deals, start, { now = new Date(), lang = "en", limit = MAX_DEALS } = {}) =>
  (Array.isArray(deals) ? deals : [])
    .map(d => {
      const card = promoCard(d, { today: now, lang });
      const at = pointOf(d);
      return { d, card, at, id: dealPlaceId(d), minutes: at && start ? walkMinutes(start, at) : null };
    })
    .filter(x => x.card.timing in RANK)
    .sort((a, b) => RANK[a.card.timing] - RANK[b.card.timing]
      || (a.card.timing === "later" ? String(a.d.__offer?.from || "").localeCompare(String(b.d.__offer?.from || "")) : 0)
      || (a.minutes ?? 9999) - (b.minutes ?? 9999)
      || String(a.d.name).localeCompare(String(b.d.name)))
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
const KIND_OF_TYPE = {
  food: "discounts", foodStreet: "discounts", shop: "discounts", shopPlace: "discounts",
  night: "entertainment", nightlife: "entertainment", nightStreet: "entertainment", event: "entertainment", festival: "entertainment",
  booking: "activities", craft: "activities", free: "activities", town: "activities",
};
export const dealKind = (d) => {
  const set = String(d?.__dealKind || "");
  if (DEAL_KINDS.includes(set)) return set;
  const type = String(d?._exampleId || "").split(":")[0] || d?._src || "";
  return KIND_OF_TYPE[type] || "discounts";
};
// The tourism centre's own site, where everything that is not a deal lives.
// "Less competitive to the page": Gemlyx shows the deals and sends people
// there for the rest.
export const centreSite = (lang) => (lang === "lt" ? "https://klaipedatravel.lt/" : "https://klaipedatravel.lt/en/");

export const DealsNearYou = ({ deals = [], examples = false, lang = "en", defaultFrom = "", country = "LT", sticky = true }) => {
  const starts = NOW_STARTS[country] || {};
  const [from, setFrom] = useState(starts[defaultFrom] ? defaultFrom : Object.keys(starts)[0]);
  const [here, setHere] = useState(null);
  const [note, setNote] = useState("");
  const [going, setGoing] = useState(null);
  const canLocate = typeof navigator !== "undefined" && !!navigator.geolocation && !!NOW_AREAS[country];
  const start = from === "here" && here ? { id: "here", name: uiT("now.whereYouAre", lang), lat: here.lat, lon: here.lon, ship: false } : starts[from];
  const useHere = () => {
    setNote("");
    try {
      navigator.geolocation.getCurrentPosition((p) => {
        const at = { lat: p.coords.latitude, lon: p.coords.longitude };
        if (!inNowArea(country, at)) { setNote(uiT("now.notHere", lang)); return; }
        setHere(at); setFrom("here");
      }, () => setNote(uiT("now.noLocation", lang)), { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 });
    } catch { setNote(uiT("now.noLocation", lang)); }
  };

  const all = useMemo(() => nearbyDeals(deals, start, { now: new Date(), lang, limit: Infinity }), [deals, start?.lat, start?.lon, lang]);
  const [kind, setKind] = useState(null);
  const counts = useMemo(() => Object.fromEntries(DEAL_KINDS.map(k => [k, all.filter(x => dealKind(x.d) === k).length])), [all]);
  const list = useMemo(() => (kind ? all.filter(x => dealKind(x.d) === kind) : all).slice(0, MAX_DEALS), [all, kind]);

  // Counted once per visit, for the places listed: what a partner sees as
  // "times your offer was shown".
  const counted = useRef(false);
  useEffect(() => {
    if (counted.current || !list.length) return;
    counted.current = true;
    dealsSeen(list.map(x => x.id), country);
  }, [list.length]);

  const pill = (on) => ({
    flex: "0 0 auto", background: on ? `${C.gold}22` : "transparent", color: on ? C.gold : C.muted,
    border: `1px solid ${on ? `${C.gold}88` : C.border}`, borderRadius: 100, padding: "5px 11px",
    fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
  });
  // The filters, as an app has them: one row, the chosen one filled. Tapping
  // the chosen one again shows everything.
  const tab = (on) => ({
    flex: 1, minWidth: 0, background: on ? C.gold : C.surface, color: on ? C.onGold : C.light,
    border: `1px solid ${on ? C.gold : C.border}`, borderRadius: 12, padding: "9px 6px",
    fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  });

  return (
    <section data-testid="deals-near" style={{ marginBottom: 30 }}>
      <style>{CORNER_MAP_CSS}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "0 0 10px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, fontFamily: "'Fraunces', serif", lineHeight: 1.2, margin: 0 }}>{uiT("trips.dealsH", lang)}</h2>
        {examples && <span data-testid="deals-near-examples" style={{ fontSize: 10, fontWeight: 700, color: C.text, border: `1px solid ${C.border}`, borderRadius: 100, padding: "2px 8px", letterSpacing: 0.4 }}>{uiT("deals.example", lang)}</span>}
      </div>

      <div data-testid="deals-filters" role="tablist" style={{ display: "flex", gap: 6, padding: "8px 0", marginBottom: 6, background: C.bg, ...(sticky ? { position: "sticky", top: 0, zIndex: 20 } : {}) }}>
        {DEAL_KINDS.map(k => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(cur => (cur === k ? null : k))} style={tab(kind === k)} data-testid={`deals-filter-${k}`}>
            {uiT(`explore.${k}`, lang)}{counts[k] ? ` ${counts[k]}` : ""}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginBottom: 12, paddingBottom: 2 }}>
        {Object.keys(starts).map(k => (
          <button key={k} onClick={() => setFrom(k)} aria-pressed={k === from} style={pill(k === from)}>
            {uiT(k === "terminal" ? "now.fromShip" : "now.fromCentre", lang)}
          </button>
        ))}
        {canLocate && (
          <button onClick={useHere} aria-pressed={from === "here"} style={pill(from === "here")} data-testid="deals-near-here">
            {uiT("now.fromHere", lang)}
          </button>
        )}
      </div>
      {note && <div style={{ fontSize: 12, color: "#FFB347", margin: "-4px 0 10px" }}>{note}</div>}

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
                      onTap={x.minutes != null ? () => { askForCompass(); setGoing(x); } : null} />
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {x.at && x.minutes != null && (
                    <button onClick={() => { askForCompass(); setGoing(x); }} data-testid="deal-near-go"
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

      {going && start && (
        <WalkMode walk={walkToDeal(start, going)} madeAt={null} lang={lang} country={country} loop={false}
          cardFor={() => ({ emoji: "◈", ...(going.d.photo ? { photo: going.d.photo } : {}) })}
          onReach={(s) => placeReached(s, country)} onClose={() => setGoing(null)} />
      )}
    </section>
  );
};

export default DealsNearYou;
