import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { addTileLayer } from "../utils/mapTiles";
import { ChatPlaceCards, showablePhoto } from "./ChatPlaceCards";
import { POPUP_CLASS } from "../utils/chatRail";

// ── THE MAP UNDER THE CHAT ──────────────────────────────────────────
//
// Oliver, 6 Sep 2026, beside a screenshot of Layla: "is it possible that Gemlyx
// can explain using a map? It doesn't have to be exactly the same, obviously.
// But right now there is not much else than just chatting."
//
// Which places go on it is chatRail.mapPlaces, and every rule about that lives
// there. This file draws what it is handed and nothing else: it makes no
// decision about where anywhere is, which is deliberate, because six copies of
// the "where is this row" question have been found in this codebase and five of
// them disagreed with the others.
//
// LEAFLET, NOT GOOGLE. He asked about Google Earth or Maps. Earth has had no
// web embed since the browser plugin was retired, and Google's JS map needs a
// key that ships inside the bundle and bills per load — which is the exact
// problem he spotted himself on 19 Aug about the Stadia key. Leaflet was
// already here, already themed, and already has the tile fallback he built.
//
// ── THE MAP IS BUILT ONCE AND THE PINS ARE REDRAWN ──────────────────
//
// PlaceMiniMap rebuilds its whole Leaflet instance when its pins change, which
// is fine on a page whose pins change when you navigate. THIS map's pins change
// on almost every reply, and a rebuild re-downloads every tile and throws away
// wherever the person had panned to, mid-conversation. So: one effect that
// mounts the map and never re-runs, and a second that clears a layer group and
// draws into it.
export const ChatMiniMap = ({ pins = [], dropped = 0, C, onOpen, lang = null, height = 220 }) => {
  const holderRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  // The container listener is added per pin-redraw and has to come off with it,
  // or a conversation of twenty replies leaves twenty of them on one element.
  const cleanRef = useRef(null);
  // ── THE POPUP IS A REAL CARD, PORTALLED IN ──────────────────────
  //
  // Oliver, 6 Sep: "have them as small pop ups with a picture."
  //
  // Leaflet takes an HTML string or a DOM node, and the string is the trap: a
  // hand-written `<img>` in here would be a second copy of a photo rule that
  // has a licence check in it, and the credit is the one thing in this app
  // with a legal edge on it. So Leaflet gets an empty div per pin and React
  // renders the actual ChatPlaceCards into it. One card, three layouts, one
  // place where the credit can be got wrong.
  const [hosts, setHosts] = useState([]);
  // A fresh closure every render must not be able to invalidate anything, which
  // is the ref's whole job. Same reason PlaceMiniMap holds onOpenNeighbour this
  // way, and it matters more here because this component's parent re-renders on
  // every keystroke in the chat box.
  const openRef = useRef(onOpen);
  openRef.current = onOpen;

  const list = Array.isArray(pins) ? pins : [];
  // DEPENDED ON BY VALUE. The same pins in the same places arriving as a new
  // array must not count as a change, or the redraw runs on every keystroke.
  const pinKey = list.map(p => `${p?.key}@${p?.lat},${p?.lon}${p?.latest ? "*" : ""}`).join("|");
  const any = list.length > 0;

  // ── MOUNT ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!any || !holderRef.current || mapRef.current) return;
    const map = L.map(holderRef.current, {
      zoomControl: false,
      // The chat panel scrolls, and a map that eats the wheel traps somebody
      // halfway through a conversation. Buttons and pinch only, same call
      // PlaceMiniMap made for the same reason.
      scrollWheelZoom: false,
      dragging: true,
      attributionControl: false,
    }).setView([56.0, 10.4], 6);   // Denmark, until there are pins to fit
    addTileLayer(L, map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // Leaflet measures its container the instant L.map() runs, and this one
    // mounts inside a panel whose layout is still settling. Same settle problem
    // the guide map and the place map both hit.
    requestAnimationFrame(() => map.invalidateSize());
    const t = setTimeout(() => map.invalidateSize(), 400);
    return () => { clearTimeout(t); map.remove(); mapRef.current = null; layerRef.current = null; };
  }, [any]);

  // ── PINS ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    if (cleanRef.current) { cleanRef.current(); cleanRef.current = null; }
    layer.clearLayers();
    // The hosts go with the markers. Leaving them would keep React rendering
    // cards into divs that are no longer attached to anything.
    if (!list.length) { setHosts([]); return; }
    // The newest ones last, so they are drawn on top of anything they overlap.
    // Not numbered: mention order is not itinerary order, and a numbered pin
    // asserts a route nobody has agreed to. mapPlaces says why at length.
    const ordered = [...list].sort((a, b) => Number(!!a.latest) - Number(!!b.latest));
    const made = [];
    ordered.forEach(p => {
      const gold = C?.gold || "#E5B769";
      const size = p.latest ? 15 : 11;
      const icon = L.divIcon({
        className: "gemlyx-chat-pin",
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${p.latest ? gold : "#EFE9D6"};border:2px solid #0A0F1E;box-shadow:${p.latest ? `0 0 0 3px ${gold}55, ` : ""}0 1px 5px rgba(0,0,0,.55);${p.latest ? "" : "opacity:.9;"}"></div>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2],
      });
      const marker = L.marker([p.lat, p.lon], {
        icon,
        title: p.place?.name || "",
        keyboard: false,
        zIndexOffset: p.latest ? 1000 : 0,
      }).addTo(layer);
      // ── A POPUP ONLY WHERE THERE IS A PICTURE TO PUT IN IT ──────
      // showablePhoto is the same check the cards make, licence rule and all,
      // and it says no for a place with no photograph and for one whose credit
      // is required and missing. A card with neither is a tooltip with a close
      // button, so those pins get a real tooltip and open on a click.
      const shot = showablePhoto(p.place);
      if (!shot) {
        marker.bindTooltip(String(p.place?.name || ""), { direction: "top", offset: [0, -6], opacity: 0.95 });
        // ── AND IT MUST TAKE THE OTHER CARD DOWN ──────────────────
        // Found in the browser, not by reading: hovering this pin left the
        // PREVIOUS place's card open, so you pointed at Skagen and read
        // Aarhus. Worse, the stale card covered this pin, and the click meant
        // for Skagen landed on Aarhus's photograph and opened Aarhus.
        // openPopup does this for the pins that have one, via autoClose; a pin
        // with no card has to say so itself.
        marker.on("mouseover", () => map.closePopup());
        marker.on("click", () => openRef.current?.(p.place));
        return;
      }
      const host = document.createElement("div");
      marker.bindPopup(host, {
        className: POPUP_CLASS,
        minWidth: 132, maxWidth: 132,
        closeButton: true,
        // The offset is set per open, below, because which side it goes on is
        // a fact about where the pin is sitting at that moment.
        autoPanPadding: [12, 12],
        // Clicking the MAP must not close it, or the click that lands on the
        // card underneath closes the card first and the entry never opens.
        closeOnClick: false,
      });
      // ── HOVER OPENS IT, WHICH IS WHY THIS IS NOT CLICK-ONLY ─────
      //
      // Measured in a real browser before writing this: on a 138 by 192 map an
      // open card covers about half of it, and Playwright could not reach the
      // second pin at all — "<div>Aarhus</div> ... intercepts pointer events".
      // A person can close it and tap again; that is two taps to compare two
      // places, on the feature whose whole point is comparing places.
      //
      // The rail and this map only exist above 900px (chatRail's breakpoint),
      // which is a pointer device, so hovering swaps the card with no clicks at
      // all and the covering never happens. Click still opens it for a touch
      // laptop, and closeButton stays for the same reason.
      // ── AND WHICH SIDE IT OPENS ON IS COUNTED, NOT GUESSED ──────
      //
      // Three goes at this, each one measured in a browser, and the first two
      // were reasoning:
      //
      //   ABOVE THE PIN (Leaflet's default). 54 per cent of a 138px map, and
      //   over BOTH other pins. Denmark runs south to north, a trip up from
      //   Germany runs south to north, so a card above its pin lands exactly
      //   where the rest of the trip is. The worst possible direction.
      //
      //   SIDEWAYS, AWAY FROM THE MAP'S MIDDLE. Down to 21 per cent, and still
      //   over Aarhus: Ribe sits in the left half, so its card was thrown
      //   right, which is precisely where the rest of Jutland is. The middle
      //   of the MAP has nothing to do with where the other places are.
      //
      // So it is counted instead. The card is a known 132 by 108, the other
      // pins' positions are known, and "how many would this side cover" is
      // arithmetic rather than a rule of thumb. Ribe now throws left, over the
      // North Sea, and the whole trip stays visible.
      //
      // Per open, not per pin: the map refits every time a place is added, so
      // a side chosen when the pin was bound is the wrong side two replies on.
      const sideFor = () => {
        const size = map.getSize();
        const here = map.latLngToContainerPoint(marker.getLatLng());
        const others = list
          .filter(o => o.key !== p.key)
          .map(o => map.latLngToContainerPoint(L.latLng(o.lat, o.lon)));
        const score = (dir) => {
          const cx = here.x + dir * 76;         // half the card, plus the pin
          const l = cx - 66, r = cx + 66, t = here.y - 54, b = here.y + 54;
          // ── AND SPILLING COSTS LESS THAN HIDING ──────────────────
          // This was 1, the same as covering a pin, and the browser said no:
          // Ribe scored left 1 (spills, hides nothing) against right 1 (fits,
          // hides Aarhus), the tie-break sent the card right, and Aarhus
          // became unreachable. The two are not worth the same. Off the edge,
          // Leaflet pans to fit and everything stays reachable; over a pin,
          // that pin cannot be hovered or tapped at all. So a spill has to
          // lose to a fit and beat a covered pin, which is what 0.4 buys.
          const spills = l < 0 || r > size.x ? 0.4 : 0;
          return others.filter(o => o.x > l && o.x < r && o.y > t && o.y < b).length + spills;
        };
        const left = score(-1), right = score(1);
        // A tie goes away from the middle, which is the old rule kept as the
        // tie-break it was always good enough to be.
        if (left === right) return here.x < size.x / 2 ? 1 : -1;
        return left < right ? -1 : 1;
      };
      marker.on("mouseover", () => {
        const pop = marker.getPopup();
        // 54 is half the card's height, which centres it on the pin now that
        // the tip is gone.
        if (pop) pop.options.offset = L.point(sideFor() * 76, 54);
        marker.openPopup();
      });
      // NOT on the marker's own mouseout: the card sits directly above the pin,
      // so moving towards it leaves the marker, and closing there would make
      // the card impossible to reach. The container's mouseleave below is the
      // honest boundary, because the card is inside the container.
      made.push({ key: p.key, place: p.place, host });
    });
    // Set once per pin change, not per render: the effect below it does not
    // re-run on this, because its dep is pinKey and pinKey has not moved.
    setHosts(made);
    // Refit whenever the pins change and NOT otherwise, which is what makes
    // this readable: a new place appears and the map opens up to include it,
    // and a pan the person made themselves survives every keystroke in between.
    // maxZoom 10 so a single pin does not land on a street plan of one square.
    map.fitBounds(L.latLngBounds(list.map(p => [p.lat, p.lon])).pad(0.35), { maxZoom: 10 });
    const shut = () => map.closePopup();
    map.getContainer().addEventListener("mouseleave", shut);
    cleanRef.current = () => map.getContainer().removeEventListener("mouseleave", shut);
    requestAnimationFrame(() => map.invalidateSize());
    // pinKey, not `pins`: by value, for the reason above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey]);

  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);

  // A map of Denmark with nothing on it explains less than the space it takes.
  if (!any) return null;

  return (
    <div>
      <div
        ref={holderRef}
        style={{ height, borderRadius: 12, overflow: "hidden", border: `1px solid ${C?.border || "#2A3350"}` }}
      />
      {hosts.map(h => createPortal(
        <ChatPlaceCards
          layout="pin"
          places={[h.place]}
          C={C}
          onOpen={onOpen}
          lang={lang}
        />,
        h.host,
        h.key,
      ))}
      <div style={{ fontSize: 10, color: C?.muted || "#9AA3BC", marginTop: 6, lineHeight: 1.5 }}>
        {list.length > 1 ? "Where these are. Tap a pin to see it." : "Tap the pin to see it."}
        {/* Named rather than swallowed. A map quietly showing part of the
            conversation is a map of a different trip. */}
        {dropped > 0 && ` ${dropped} earlier ${dropped === 1 ? "place is" : "places are"} off this map.`}
      </div>
    </div>
  );
};
