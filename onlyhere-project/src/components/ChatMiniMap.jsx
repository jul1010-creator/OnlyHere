import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { addTileLayer } from "../utils/mapTiles";
import { ChatPlaceCards, showablePhoto } from "./ChatPlaceCards";
import { POPUP_CLASS, RAIL_BREAKPOINT_PX, LABEL_CLASS, labelSides } from "../utils/chatRail";
import { distinctThemes, THEME_LABEL } from "../utils/placeThemes";
import { entryWord } from "../utils/entryWords";
import { t as uiT } from "../utils/uiLanguage";

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
// Skagen down to the German border, Blåvand across to Bornholm. Framed by
// fitBounds rather than by a hand-picked zoom, so a 210px column and a 300px
// one both get the country instead of one of them getting Jutland.
const DENMARK = [[54.5, 8.0], [57.8, 15.3]];

// ── AND WHERE DENMARK IS, WHICH IS THE OUTER VERSION OF THE SAME ────
//
// Oliver, 8 Sep 2026: "it still makes people question 'Where is Billund
// located?'" A single pin now lands on the country rather than on a field, and
// that took the descent out of the opening move: flying from Denmark to Denmark
// is not a flight.
//
// So the map opens one step further out, on southern Norway, southern Sweden
// and the top of Germany, and the first pin flies from there down to Denmark.
// The animation he asked for is intact and it now carries a second answer for a
// reader who has never had reason to know where Denmark is either.
//
// Not the whole of Europe: at that scale Denmark is a smudge and the flight is
// a title sequence. This is the smallest frame with a recognisable neighbour in
// every direction.
const NORTHERN_EUROPE = [[52.4, 2.5], [60.8, 21.0]];

// The pin's own colour, named once. Oliver, 8 Sep 2026, asked for the shape
// everyone knows and then, shown it in the site's gold, said "red". Gold is
// this app's accent and is already on every heading and badge, so a gold pin
// reads as furniture; red is the one colour nothing else here uses.
const PIN_RED = "#E8232A";

export const ChatMiniMap = ({ pins = [], dropped = 0, C, onOpen, lang = null, height = 220, sayWhatFor = false }) => {
  // ── THE READER'S LANGUAGE, ONCE ─────────────────────────────────
  //
  // `lang` is readerLanguage()'s OBJECT, not a two letter code. Handing the
  // object to entryWord or to t() gives them "[object Object]", which is not a
  // language either of them knows, so both return the English and say nothing
  // about it: a translation that silently does not happen. ChatPlaceCards reads
  // the same field the same way one file over.
  //
  // It lived inside the pin effect, which is why the CAPTION under the map was
  // three English sentences sitting under labels that were already translated.
  const uiCode = String(lang?.tag || "").split("-")[0].toLowerCase();
  const holderRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  // The container listener is added per pin-redraw and has to come off with it,
  // or a conversation of twenty replies leaves twenty of them on one element.
  const cleanRef = useRef(null);
  // ── "WELL THAT WAS BORING" ──────────────────────────────────────
  //
  // Oliver, 6 Sep 2026, watching the first pin land: one dot on a tight crop of
  // Copenhagen with "Tap the pin to see it" under it. He was right. A map
  // showing one place at street scale has told you nothing you did not already
  // know, and the whole argument for putting a map here was that it shows
  // WHERE.
  //
  // "The map should start from up, and then zoom down to Copenhagen with a
  // Copenhagen image/description, popping up. And then the rest should come up
  // too afterwards."
  //
  // So it opens above the country and flies down, and the card opens itself
  // when it lands. The flight is what hands the context over: you see where
  // Denmark is, then you see which part of Denmark this is. A jump cut to a
  // crop gives you the second half only.
  //
  // WHERE IT LANDS moved on 8 Sep. It used to land on the pin, and Oliver, on
  // Billund: "it still makes people question 'Where is Billund located?'" One
  // pin lands on the country now and the opening moved out a step to keep the
  // descent. Two or more still land on the pins, because by then the question
  // is how far apart they are.
  const flownRef = useRef(false);
  const markersRef = useRef(new Map());
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

  // ── AND IT MUST NOT BUILD A MAP NOBODY CAN SEE ──────────────────
  //
  // Found by an adversarial review. `.chat-rail` is display:none below 900px
  // and this component sits inside it, but CSS does not stop an effect: every
  // phone visitor with one resolvable place was building a full Leaflet
  // instance, a tile layer, a zoom control and a flyToBounds animation on a
  // 0x0 element. Leaflet's getBoundsZoom on a zero-size container returns
  // Infinity, clamped to maxZoom, so fitBounds(DENMARK) landed at street scale.
  //
  // Worse than the waste: flownRef was spent on the invisible map, so a tablet
  // rotated past the breakpoint got the short pan instead of the establishing
  // flight the whole design turns on.
  //
  // The same constant the CSS uses, so the query and the rule cannot drift.
  // Subscribed rather than read once, because a window gets resized and a
  // tablet gets rotated.
  const [wide, setWide] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return window.matchMedia(`(min-width: ${RAIL_BREAKPOINT_PX}px)`).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(`(min-width: ${RAIL_BREAKPOINT_PX}px)`);
    const onChange = (e) => setWide(e.matches);
    // addListener is the old spelling, and Safari carried it long enough to be
    // worth the fallback rather than a silently dead subscription.
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    setWide(mq.matches);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const list = Array.isArray(pins) ? pins : [];
  // DEPENDED ON BY VALUE. The same pins in the same places arriving as a new
  // array must not count as a change, or the redraw runs on every keystroke.
  const pinKey = list.map(p => `${p?.key}@${p?.lat},${p?.lon}${p?.latest ? "*" : ""}`).join("|");
  const any = list.length > 0 && wide;
  // ── THE MAP IS THERE BEFORE THERE IS ANYTHING ON IT ───────────────
  // Oliver, 8 Sep 2026: "I think map should already be shown from start."
  // It was gated on having a pin, so the panel was empty until Gemlyx happened
  // to name somewhere and then a map appeared out of nowhere mid-conversation.
  // A map of Denmark with nothing on it is not an empty state, it is the
  // context every pin is about to be placed in, and it is the thing that says
  // what this column is for without a sentence explaining it.
  const shown = wide;

  // ── MOUNT ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!shown || !holderRef.current || mapRef.current) return;
    const map = L.map(holderRef.current, {
      zoomControl: false,
      // The chat panel scrolls, and a map that eats the wheel traps somebody
      // halfway through a conversation. Buttons and pinch only, same call
      // PlaceMiniMap made for the same reason.
      scrollWheelZoom: false,
      dragging: true,
      attributionControl: false,
    // One step out from the country, which is where every one of these starts.
    // Bounds rather than a fixed zoom, so it frames the same thing at 240
    // pixels wide and at 380, instead of being right at one of them.
    }).fitBounds(NORTHERN_EUROPE, { padding: [6, 6] });
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
    // Derived at the top of the component now, because the caption under the
    // map needs it too and was rendering English while these labels were
    // already translated. See uiCode there for why it is `lang.tag` and not
    // `lang`. Read out of the closure, exactly as it was: this effect's deps
    // are [pinKey] and always have been.
    const code = uiCode;
    // ── ONE THEME EACH, CHOSEN SO THEY DIFFER ────────────────────
    //
    // Across the whole set rather than per pin, which is the entire idea: the
    // answer for Aarhus depends on what Aalborg took. See distinctThemes.
    // ── AND ONLY ONCE THERE IS SOMETHING TO MATCH AGAINST ──────
    // Oliver, 10 Sep 2026: "If you know enough about a person, then you can help
    // the user make a decision." Before that the app is picking the criterion
    // and ranking on it, which is the app choosing the trip. Shut, every pin is
    // a name, which is also what stops five labels fighting over a 380px map on
    // the turn that names the most places and knows the least.
    const picked = sayWhatFor ? distinctThemes(list.map(p => ({ key: p.key, themes: p.place?.themes }))) : {};
    // ── AND LOWERCASE, EXCEPT IN GERMAN ──────────────────────────
    // THEME_LABEL holds capitalised nouns because they are labels on a chip.
    // Inside a sentence English and Danish want them lowercase, and German
    // capitalises every noun, so it keeps the label as it is. A fact about the
    // language rather than a special case.
    const inSentence = (word) => (code === "de" ? word : word.toLowerCase());
    const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    // The newest ones last, so they are drawn on top of anything they overlap.
    // Not numbered: mention order is not itinerary order, and a numbered pin
    // asserts a route nobody has agreed to. mapPlaces says why at length.
    const ordered = [...list].sort((a, b) => Number(!!a.latest) - Number(!!b.latest));
    // Collected as the markers are made and laid out once at the end: a side
    // chosen while the map is still flying is the wrong side when it lands.
    const labelled = [];
    const made = [];
    markersRef.current = new Map();
    ordered.forEach(p => {
      // ── A PROPER POINTER, NOT A DOT ───────────────────────────
      //
      // Oliver, 8 Sep 2026: "It needs to work like it does now with the
      // pointer. We just need a proper pointer", with a picture of the shape
      // everyone has seen on a map since paper ones: a teardrop with a hole
      // through it. A circle is a dot ON the map; a pin POINTS AT a spot, and
      // the difference is the whole reason the shape exists.
      //
      // THE ANCHOR IS THE TIP, which is the half a dot could never get right.
      // A circle centred on its coordinate covers the thing it marks; the
      // pin's point sits on the coordinate and the body stands above it.
      //
      // ── AND RED, WHICH HE ASKED FOR IN ONE WORD ───────────────
      // I offered this app's gold and he said "red". He is right: gold is the
      // site's accent and it is on every heading, every badge and the Detour
      // button itself, so a gold pin reads as more of the furniture. Red on a
      // dark map is the one colour nothing else here uses, and a pin's whole
      // job is to be found before it is read.
      //
      // The newest place keeps its own reading, which the dots carried in the
      // colour and now carry in SIZE and weight: bigger, full strength, and a
      // faint halo. Two reds would have been a second thing to learn.
      const w = p.latest ? 23 : 17;
      const h = Math.round(w * 4 / 3);
      const fill = PIN_RED;
      const icon = L.divIcon({
        className: "gemlyx-chat-pin",
        html: `<svg width="${w}" height="${h}" viewBox="0 0 24 32" style="display:block;filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))${p.latest ? ` drop-shadow(0 0 6px ${PIN_RED}88)` : ""};${p.latest ? "" : "opacity:.72;"}">`
          + `<path d="M12 1.2C6.1 1.2 1.3 6 1.3 11.9c0 7.6 10.7 18.9 10.7 18.9s10.7-11.3 10.7-18.9C22.7 6 17.9 1.2 12 1.2z" fill="${fill}" stroke="#0A0F1E" stroke-width="2"/>`
          + `<circle cx="12" cy="11.9" r="4.3" fill="#0A0F1E"/>`
          + `</svg>`,
        iconSize: [w, h], iconAnchor: [w / 2, h],
      });
      const marker = L.marker([p.lat, p.lon], {
        icon,
        title: p.place?.name || "",
        keyboard: false,
        zIndexOffset: p.latest ? 1000 : 0,
      }).addTo(layer);
      // ── AND WHAT IT IS FOR, WITHOUT ANYBODY HAVING TO TAP ───────
      //
      // Oliver, 9 Sep 2026, on a reply that had offered him three cities with
      // one card open over Aarhus: "is it possible to include what the city is
      // best for? When given options like that", then "have all of them shown
      // (without overlapping oneanother)".
      //
      // From the row's OWN themes, so a label cannot claim something the entry
      // does not, and empty for a row carrying none: the hardcoded fallback
      // towns have no themes at all, and "Aarhus ·" with nothing after it is
      // worse than "Aarhus".
      //
      // Escaped, because this goes in as HTML and a place name is content.
      // Empty when the row carries no themes, and the label is then the name
      // alone: the fallback towns have none, and "Aarhus · " with nothing after
      // it is worse than "Aarhus".
      const theme = picked[p.key];
      const best = theme
        ? `${uiT("map.bestFor", code)} ${inSentence(entryWord(THEME_LABEL[theme] || "", code))}`
        : "";
      marker.bindTooltip(
        `<span class="pin-name">${esc(p.place?.name || "")}</span>`
        + (best ? `<span class="pin-best">${esc(best)}</span>` : ""),
        { permanent: true, direction: "top", className: LABEL_CLASS,
          opacity: 1, interactive: false, offset: [0, -h] });
      labelled.push({ key: p.key, ph: h, marker });

      // ── A POPUP ONLY WHERE THERE IS A PICTURE TO PUT IN IT ──────
      // showablePhoto is the same check the cards make, licence rule and all,
      // and it says no for a place with no photograph and for one whose credit
      // is required and missing. A card with neither is a tooltip with a close
      // button, so those pins get a real tooltip and open on a click.
      const shot = showablePhoto(p.place);
      if (!shot) {
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
      markersRef.current.set(p.key, marker);
    });
    // Set once per pin change, not per render: the effect below it does not
    // re-run on this, because its dep is pinKey and pinKey has not moved.
    setHosts(made);
    // ── THE FLIGHT DOWN, AND WHY ONLY THE FIRST ONE FLIES ────────
    //
    // Refit whenever the pins change and NOT otherwise, which is what makes
    // this readable: a new place appears and the map opens up to include it,
    // and a pan the person made themselves survives every keystroke in between.
    // maxZoom 10 so a single pin does not land on a street plan of one square.
    //
    // The FIRST set flies, from the country down to the place, because that is
    // the move that says where in Denmark this is. Every set after it is a
    // shorter eased pan: the country has been established by then, and
    // re-flying from altitude on every reply is a title sequence, not a map.
    // ── ONE PIN IS A QUESTION, NOT AN ANSWER ─────────────────────
    //
    // Oliver, 8 Sep 2026: "this map demonstration also shows a poor
    // presentation of Billund. Great, we got it animated, but it still makes
    // people question 'Where is Billund located?'"
    //
    // He is right and the cause is arithmetic. One pin makes a bounds of zero
    // size, pad() multiplies zero by 0.35 and gets zero, and fitBounds on a
    // point goes as close as it is allowed. maxZoom 10 was the only thing
    // stopping it, so a lone town landed on fifteen kilometres of farmland with
    // Grindsted in the corner: a picture that answers "what is near Billund"
    // to somebody who asked "where IS Billund".
    //
    // A map of one place is a map of where that place is. So a single pin gets
    // the country, which is the frame the map already opens on, and the flight
    // becomes a pin arriving on Denmark rather than a dive into a field.
    //
    // TWO OR MORE FIT TO THE PINS, unchanged. By then the question has changed:
    // the reader knows where Denmark is and wants to know how far Ribe is from
    // Aarhus, and that answer is the one this map was built for.
    const bounds = list.length > 1
      ? L.latLngBounds(list.map(p => [p.lat, p.lon])).pad(0.35)
      : L.latLngBounds(DENMARK);
    const first = !flownRef.current;
    flownRef.current = true;
    // Somebody who has asked their system for less movement gets none. The map
    // still ends up in the same place, which is the half carrying the meaning.
    const still = typeof window !== "undefined" && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) map.fitBounds(bounds, { maxZoom: 10, animate: false });
    else map.flyToBounds(bounds, { maxZoom: 10, duration: first ? 1.9 : 0.9 });
    // ── AND THE CARD OPENS ITSELF WHEN IT LANDS ──────────────────
    //
    // "with a Copenhagen image/description, popping up." Opening it before the
    // flight would drag the card across the screen for two seconds AND open it
    // on the wrong side, because sideFor measures where the pins are at the
    // moment it runs. So it waits for moveend, which fires once at the end of
    // the flight, and once is why this is `once` rather than `on`.
    // ── WHICH CARD OPENS, AND WHY IT IS NOT SIMPLY THE NEWEST ────
    //
    // Caught in the browser: the third pin arrived, nothing popped up, and the
    // card that WAS open closed itself. The newest place had no photograph, so
    // no card was ever bound to it, and a pin with no card takes the open one
    // down on hover by design.
    //
    // A reply naming somewhere with no picture is not a reason to show nothing.
    // So: the newest pin that actually HAS a card, preferring the ones this
    // reply introduced, and falling back to the most recent card on the map.
    // Reversed, because several pins can be `latest` and the last of them is
    // the one the sentence ended on.
    const carded = list.filter(p => markersRef.current.get(p.key)?.getPopup());
    const newest = [...carded].reverse().find(p => p.latest) || carded[carded.length - 1];
    const landed = () => {
      const marker = newest && markersRef.current.get(newest.key);
      // Through the same handler a hover uses, so the card that opens itself
      // and the card you point at are chosen the same way. A second path here
      // is how the two would start disagreeing about which side to open on.
      if (marker?.getPopup()) marker.fire("mouseover");
      layOut();
    };
    if (still) landed(); else map.once("moveend", landed);
    // ── WHERE EACH LABEL GOES, MEASURED RATHER THAN GUESSED ──────
    //
    // The sizes are read off the rendered elements: a name wraps differently in
    // Danish, and a guessed width is a guessed answer. The rule itself is pure
    // and lives in chatRail.labelSides, which is where its reasoning is too.
    //
    // Newest first, so the place the reply just added gets the pick of the four
    // sides and the older ones fit around it.
    const layOut = () => {
      const seen = labelled.filter(x => x.marker.getTooltip()?.getElement());
      if (!seen.length) return;
      const order = [...seen].sort((a, b) => {
        const la = list.find(p => p.key === a.key)?.latest ? 0 : 1;
        const lb = list.find(p => p.key === b.key)?.latest ? 0 : 1;
        return la - lb;
      });
      const pins = order.map(x => {
        const el = x.marker.getTooltip().getElement();
        const at = map.latLngToContainerPoint(x.marker.getLatLng());
        return { key: x.key, x: at.x, y: at.y, w: el.offsetWidth, h: el.offsetHeight, ph: x.ph };
      });
      const sides = labelSides({ pins, size: map.getSize() });
      for (const x of order) {
        const tip = x.marker.getTooltip();
        const side = sides[x.key] || "top";
        tip.options.direction = side;
        // The anchor is the pin's TIP and the body stands above it, so a label
        // above has to clear the whole pin and one beside it sits on the body.
        tip.options.offset = side === "top" ? L.point(0, -x.ph)
          : side === "bottom" ? L.point(0, 0)
          : L.point(0, -Math.round(x.ph / 2));
        tip.update();
      }
    };
    // Once when the flight ends, and again whenever the view moves, because
    // every side above was chosen from container pixels and a pan moves them.
    map.on("moveend zoomend", layOut);

    const shut = () => map.closePopup();
    map.getContainer().addEventListener("mouseleave", shut);
    cleanRef.current = () => {
      map.getContainer().removeEventListener("mouseleave", shut);
      map.off("moveend zoomend", layOut);
    };
    requestAnimationFrame(() => map.invalidateSize());
    // pinKey, not `pins`: by value, for the reason above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey]);

  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);

  // A map nobody can see explains nothing at all. Narrow screens get the
  // inline cards instead and no map at all, which is what `wide` is.
  if (!shown) return null;

  return (
    // ── AS TALL AS THE CONVERSATION BESIDE IT ────────────────────────
    //
    // Oliver, 8 Sep 2026: "look the chatbar travels to the South Pole because
    // of all the pictures that pop up in the sidepanel", and "the map is not
    // given enough space."
    //
    // Those are one fault. A fixed 220px box under two photo cards made the
    // rail 640px tall in a row whose other column was capped, so the rail set
    // the height of everything under it AND the map was the smallest thing in
    // the column it was pushing down.
    //
    // So the box grows into whatever the rail has, with a floor in chatRail's
    // CSS for the first turn, and the rail takes its height from the message
    // list. `height` stays a prop and stays the floor, because a caller with no
    // flex parent (the suite renders one) still needs a box with a size.
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}>
      <div
        ref={holderRef}
        style={{ flex: "1 1 auto", minHeight: height, borderRadius: 12, overflow: "hidden", border: `1px solid ${C?.border || "#2A3350"}` }}
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
      {/* No line under an empty map. There is nothing to tap yet, and a
          sentence explaining a control nobody can use is the clutter Oliver
          objects to on every form in this app. */}
      <div style={{ fontSize: 10, color: C?.muted || "#9AA3BC", marginTop: 6, lineHeight: 1.5 }}>
        {list.length === 0 ? "" : uiT(list.length > 1 ? "map.tapOne" : "map.tapTheOne", uiCode)}
        {/* Named rather than swallowed. A map quietly showing part of the
            conversation is a map of a different trip. */}
        {dropped > 0 && ` ${uiT(dropped === 1 ? "map.offMapOne" : "map.offMapMany", uiCode).replace("{n}", String(dropped))}`}
      </div>
    </div>
  );
};
