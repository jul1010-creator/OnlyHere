import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { addTileLayer } from "../utils/mapTiles";
import { ChatPlaceCards, showablePhoto } from "./ChatPlaceCards";
import { POPUP_CLASS, RAIL_BREAKPOINT_PX, LABEL_CLASS, labelSides, isSpotPin, spotsShowAt } from "../utils/chatRail";
import { distinctThemes, THEME_LABEL } from "../utils/placeThemes";
import { entryWord } from "../utils/entryWords";
import { makeCamera } from "../utils/mapDirections";
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

// How close the map gets to ONE place, whether the pins asked for it or the
// reply did. At 55.7 degrees this is about 21 metres a pixel, so a 490 pixel
// map is roughly 10 km across: a city with its water and its shape, a small
// town with the country around it. Named at module scope because two callers
// need the same number and a second copy is how they start disagreeing.
const FOCUS_ZOOM = 12;
// How close two or more pins are framed when the pins ask for a frame. At this
// latitude zoom 10 is about 86 metres a pixel, so a 490 pixel map is roughly
// 42 km across: two towns and the road between them, never one town's streets.
const CLUSTER_ZOOM = 10;
// ── HOW LONG EACH MOVE TAKES, NAMED ONCE ──────────────────────────
//
// Oliver, 12 Sep 2026: "when it zooms out, make it a little slower."
//
// They were both 1.1 seconds and they are not the same move. Zooming IN is an
// arrival: the traveller already knows where it is going, because the sentence
// just named it, and dawdling is a title sequence. Zooming OUT is the map giving
// back the country, and pulling away covers far more ground in the same time,
// so an equal duration reads as a lurch rather than as a camera. The slower one
// is also the one with something to say: watching Copenhagen shrink into
// Denmark is the frame he wants the reader to read.
//
// FIT is the app's own move, the eased pan that opens the picture up to include
// a pin that has appeared off it. Shorter than either, because nothing in the
// sentence announced it.
const OUT_SECONDS = 1.9, IN_SECONDS = 1.1, FIT_SECONDS = 0.9;

// ── THERE WAS A WIDER FRAME HERE AND IT HAS GONE ───────────────
//
// NORTHERN_EUROPE, southern Norway to the top of Germany, existed for exactly
// one reason: on 8 Sep a lone pin was made to land on DENMARK, which turned the
// opening move into a flight from Denmark to Denmark, so the map had to open
// one step further out for there to be any descent left.
//
// Both halves are undone together, because the second only ever propped up the
// first. The country is a real starting frame rather than a destination, the
// reply's own [[MAP_IN]] is the descent from it (see the flight block in the
// pin effect for how that moved), and the wider box would now only push Denmark
// into the middle of four other countries. Oliver, 12 Sep 2026, looking at
// precisely that: "Have the map default as a map of Denmark from start."

// The pin's own colour, named once. Oliver, 8 Sep 2026, asked for the shape
// everyone knows and then, shown it in the site's gold, said "red". Gold is
// this app's accent and is already on every heading and badge, so a gold pin
// reads as furniture; red is the one colour nothing else here uses.
const PIN_RED = "#E8232A";

// ── "IS THIS INTERESTING?" ────────────────────────────────────────
//
// Oliver, 13 Sep 2026: "Is it possible that when it zooms in, it can [show] a
// short description of the places (like at the final guide), and then a 'Is
// this interesting?' Yes/No. Obviously not all the time. But it's a good
// mechanism in a time of uncertainty."
//
// Three props carry it, and this component decides none of it:
//
//   ask         null, or { picked, cautionFor, onYes, onNo }. Null is the gate
//               shut, and the gate is unsureWhatTheyWant(brief) in App.jsx,
//               the same test that opens the word under a pin. It is the
//               "time of uncertainty" in his sentence, and there is no second
//               test here. With it open, every pin for a place INSIDE a town
//               (isSpotPin, so only ever drawn from SPOT_PIN_ZOOM, which is
//               "when it zooms in") carries the card with the description and
//               the question. Towns never ask: "is Aarhus interesting" is the
//               shape of the trip, and that is decided in the conversation.
//   turnedDown  the names a No has taken off the map, for the row under it.
//   onRestore   what pressing a name in that row does: the No is withdrawn
//               and the pin comes back.
//
// ── AND "OBVIOUSLY NOT ALL THE TIME" IS THREE RULES, NOT ONE ─────
//
// The brief gate is the first. The second is that a place already decided is
// not asked again: a Yes shows as its state, and a No takes the pin off, so
// there is nothing left to ask on. The third is that the card is a POPUP, one
// open at a time and only ever opened by the pointer, never by the app. That is
// Oliver's own rule from 12 Sep ("Can the photo on the map not automatically
// pop up? ... if I put my mouse on it, then it shows") and it is also what
// stops five pins named in one reply becoming five cards at once, which on a
// 380px map is a wall. A card that opened itself on the newest pin was
// considered and rejected for both reasons: it breaks the 12 Sep rule, and
// choosing WHICH pin to open is the app choosing the trip.
export const ChatMiniMap = ({ pins = [], dropped = 0, C, onOpen, lang = null, height = 220, sayWhatFor = false, focus = null, ask = null, turnedDown = [], onRestore = null }) => {
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
  // ── AND A SECOND LAYER FOR THE THINGS INSIDE THE TOWNS ────────────
  //
  // Attraction pins are built exactly like town pins and live on their own
  // layer group, which is added to the map and taken off it as the zoom
  // crosses SPOT_PIN_ZOOM. A layer rather than a filter on `list`, because the
  // markers, their labels, their cards and their hover bindings are all built
  // once per pin change: rebuilding that set on every zoom tick would rebuild
  // the card the reader is pointing at, under their cursor.
  const spotLayerRef = useRef(null);
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
  //
  // AND ON 12 SEP THE DESCENT BECAME THE REPLY'S TO MAKE. The pins no longer
  // fly anywhere on their own; see the flight block in the pin effect.
  // ── THE CAMERA, ONE MOVE AT A TIME ───────────────────────────────
  //
  // Every move goes through here, the reply's and the app's alike, because
  // Leaflet's flyTo cancels the flight before it and two callers with their own
  // flyTo were cancelling each other. The rules (a move that arrives while one
  // is playing waits its turn; the reply's move outranks the app's; the pins
  // ask for a frame only when the picture has lost one) and the clock that runs
  // them are makeCamera in utils/mapDirections.js, where the suite drives them
  // with fake timers. This component hands it the Leaflet calls and the picture
  // and decides nothing. Built with the map, below, because it needs one.
  const camRef = useRef(null);
  const pinsNowRef = useRef([]);
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
  // ── AND WHETHER THE PINS CARRY A QUESTION IS PART OF THE VALUE ──
  // A pin with no photograph gets a popup only while there is a question to
  // put in it (see the pin effect), so the gate opening or shutting changes
  // what a pin IS, and the effect has to redraw when it does. Folded into the
  // key rather than added as a second dependency, because the rule of this
  // key is "the same pins, the same way, is no change", and the same pins
  // with a different card are not the same pins the same way.
  const asking = !!ask;
  const pinKey = list.map(p => `${p?.key}@${p?.lat},${p?.lon}${p?.latest ? "*" : ""}`).join("|") + (asking ? "|ask" : "");
  const any = list.length > 0 && wide;
  // ── THE MAP IS THERE BEFORE THERE IS ANYTHING ON IT ───────────────
  // Oliver, 8 Sep 2026: "I think map should already be shown from start."
  // It was gated on having a pin, so the panel was empty until Gemlyx happened
  // to name somewhere and then a map appeared out of nowhere mid-conversation.
  // A map of Denmark with nothing on it is not an empty state, it is the
  // context every pin is about to be placed in, and it is the thing that says
  // what this column is for without a sentence explaining it.
  const shown = wide;

  // ── THE MOVES THEMSELVES ─────────────────────────────────────────
  //
  // Out is the country, which is the frame the map opens on, so a pull-back
  // lands exactly where it started rather than at some middle distance nobody
  // chose. In is the place at FOCUS_ZOOM, one number for "close" so a zoom the
  // reply asked for and a zoom the pins asked for look like one map. A fit is
  // whatever frameFor said the pins had lost: the country again, or the pins
  // framed together.
  //
  // Somebody who has asked their system for less movement gets none. They land
  // where everyone else lands, which is the half carrying the meaning: giving
  // them the country instead would be giving them less, not gentler. Returns
  // how long the move takes, which is what the camera's clock runs on, and 0
  // for a move that was instant.
  const applyMove = (map, move) => {
    const still = typeof window !== "undefined" && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (move.kind === "in") {
      if (still) { map.setView([move.lat, move.lon], FOCUS_ZOOM, { animate: false }); return 0; }
      map.flyTo([move.lat, move.lon], FOCUS_ZOOM, { duration: IN_SECONDS });
      return IN_SECONDS;
    }
    const wide = move.kind === "out" || move.frame !== "cluster";
    const b = wide
      ? L.latLngBounds(DENMARK)
      : L.latLngBounds(pinsNowRef.current.map(p => [p.lat, p.lon])).pad(0.35);
    const opts = wide ? { padding: [6, 6] } : { maxZoom: CLUSTER_ZOOM };
    const seconds = move.kind === "out" ? OUT_SECONDS : FIT_SECONDS;
    if (still) { map.fitBounds(b, { ...opts, animate: false }); return 0; }
    map.flyToBounds(b, { ...opts, duration: seconds });
    return seconds;
  };
  // The picture as the map shows it now, read only when the camera is idle.
  const pictureOf = (map) => {
    const b = map.getBounds();
    return {
      pins: pinsNowRef.current,
      view: { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() },
      country: { south: DENMARK[0][0], west: DENMARK[0][1], north: DENMARK[1][0], east: DENMARK[1][1] },
    };
  };

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
    // ── IT OPENS ON DENMARK ──────────────────────────────────────
    //
    // Oliver, 12 Sep 2026: "Have the map default as a map of Denmark from
    // start. And when towns or islands get pointed out, you zoom into them."
    //
    // It opened one step further out than that, on NORTHERN_EUROPE, and the
    // screenshot that prompted this shows what that costs: a map captioned
    // Copenhagen running from Stockholm to Berlin, with Denmark a small shape
    // in the middle of four other countries. A map of Denmark is the frame this
    // app is about, and it is the frame the zoom then departs from.
    //
    // Bounds rather than a fixed zoom, so it frames the same thing at 240
    // pixels wide and at 380, instead of being right at one of them.
    }).fitBounds(DENMARK, { padding: [6, 6] });
    addTileLayer(L, map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    // Not added here. The map opens on the whole of Denmark, where by
    // definition no attraction is worth drawing, and the zoom watcher below
    // puts it on the moment the view is close enough.
    spotLayerRef.current = L.layerGroup();
    mapRef.current = map;
    camRef.current = makeCamera({ play: (move) => applyMove(map, move), picture: () => pictureOf(map) });
    // Leaflet measures its container the instant L.map() runs, and this one
    // mounts inside a panel whose layout is still settling. Same settle problem
    // the guide map and the place map both hit.
    requestAnimationFrame(() => map.invalidateSize());
    const t = setTimeout(() => map.invalidateSize(), 400);
    return () => {
      clearTimeout(t);
      camRef.current?.stop();
      camRef.current = null;
      map.remove(); mapRef.current = null; layerRef.current = null; spotLayerRef.current = null;
    };
  }, [any]);

  // ── PINS ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    const spotLayer = spotLayerRef.current;
    if (!map || !layer || !spotLayer) return;
    if (cleanRef.current) { cleanRef.current(); cleanRef.current = null; }
    layer.clearLayers();
    spotLayer.clearLayers();
    // The hosts go with the markers. Leaving them would keep React rendering
    // cards into divs that are no longer attached to anything.
    pinsNowRef.current = list;
    // No pins is still a picture the camera can be wrong about: a refusal that
    // took the last pin off leaves it close on a town nobody is going to.
    if (!list.length) { setHosts([]); camRef.current?.pins(list); return; }
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
      }).addTo(isSpotPin(p) ? spotLayer : layer);
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
      // ── AND IT IS THE WORD, NOT A SENTENCE ABOUT IT ───────────
      //
      // It read "Best if you want history" until Oliver, 10 Sep 2026: "no need
      // to mention 'best if you want'.. that is only for when someone is in
      // doubt."
      //
      // He is right, and the prefix was answering a question nobody had asked
      // yet. What he wanted on 9 Sep was pins that "paint a difference", and
      // the difference is entirely in the word: food, history, coast. The four
      // words in front of it were the same on every pin, so they said nothing
      // and took most of the label to say it.
      //
      // Capitalised as THEME_LABEL holds it, because a label is a label again
      // rather than the tail of a sentence, which is what inSentence was for.
      const theme = picked[p.key];
      const best = theme ? entryWord(THEME_LABEL[theme] || "", code) : "";
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
      // ── AND A QUESTION IS THE OTHER REASON FOR A CARD ─────────
      // With the gate open, a place inside a town gets a card whether or not
      // it has a picture: the card is then the name, the description and the
      // question, and ChatPlaceCards says why that is not the "tooltip with a
      // close button" the rule below was written against. Read out of the
      // closure like `code` above: `asking` is in pinKey, so this effect
      // re-runs when it changes.
      const asks = asking && isSpotPin(p);
      if (!shot && !asks) {
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
        // ── AND A CARD WITH A QUESTION IN IT IS TALLER THAN 108 ────
        // The 54 above is half of the photo card. A card carrying the
        // description and the Yes/No is taller by an amount that depends on
        // the sentence, so it is measured once it is on screen and re-centred
        // on the pin. Leaflet's update() re-runs its own pan-to-fit with the
        // new offset. Nothing changes for the plain card, whose height is
        // within a few pixels of what the number assumes.
        const el = pop && typeof pop.getElement === "function" ? pop.getElement() : null;
        const tall = el ? el.offsetHeight : 0;
        if (pop && tall > 0 && Math.abs(tall / 2 - 54) > 6) {
          pop.options.offset = L.point(sideFor() * 76, Math.round(tall / 2));
          pop.update();
        }
      });
      // NOT on the marker's own mouseout: the card sits directly above the pin,
      // so moving towards it leaves the marker, and closing there would make
      // the card impossible to reach. The container's mouseleave below is the
      // honest boundary, because the card is inside the container.
      made.push({ key: p.key, place: p.place, host, asks });
      markersRef.current.set(p.key, marker);
    });
    // Set once per pin change, not per render: the effect below it does not
    // re-run on this, because its dep is pinKey and pinKey has not moved.
    setHosts(made);
    // ── THE FLIGHT DOWN, AND WHO DECIDES THERE IS ONE ────────────
    //
    // Three versions of this block, each written to a rule of Oliver's that the
    // next one moved under. 6 Sep: one pin landed on a tight crop of Copenhagen
    // and he said "the map should start from up, and then zoom down". 8 Sep,
    // Billund: a lone pin was pinned to the whole country so nobody would ask
    // "where is Billund located?", which deleted the arrival. 12 Sep, midday:
    // "why doesn't it zoom more into Copenhagen? It knows it's just Copenhagen
    // now", and a lone pin flew to FOCUS_ZOOM on its own.
    //
    // 12 Sep, evening, on a transcript where his own message put the camera on
    // a street plan of Aalborg before Gemlyx had said a word: "it shouldn't
    // zoom into Aalborg instantly here. Zoom in if Gemlyx wants to explain/show
    // something (which it still doesn't do..)."
    //
    // That is the rule the others were reaching for. The reply now runs the
    // camera (see the beats below), so a lone pin that zoomed by itself was a
    // second answer to "how close should the map be", and it always got there
    // first: the pin exists the moment a town is named, and the reply's own
    // [[MAP_IN]] then flew to where the map already was, or worse, a refit on
    // the next pin cancelled the flight the reply had just made. The country
    // is still the frame the map opens on, and "Map of Denmark, then zoom into
    // destination" still happens, only the zoom is now the reply's move.
    //
    // So the pins ask for a frame in two cases only, and frameFor in
    // utils/mapDirections.js says which: a place just added is off the
    // picture, or no pin is left on it. Both are the picture having lost
    // something. A new pin on a country view is already shown, and the map
    // stays wide until the reply flies down to show something inside it.
    //
    // Asked when the camera is idle, and remembered until it is when a move is
    // playing, so the picture read is one the traveller will see. makeCamera
    // works out which pins are new against what they were last time.
    camRef.current?.pins(list);
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
    // ── AND THE ATTRACTIONS COME AND GO WITH THE ZOOM ────────────
    //
    // The rule and the number are in chatRail.js, next to the two zooms they
    // sit between. Run once here as well as on the event, because the flight
    // that lands on a place fires zoomend before this effect's first paint on
    // some paths and a pin that only appears on the NEXT pan is a pin nobody
    // sees.
    //
    // layOut is called after, not instead: a label whose marker has just been
    // put on the map has no element until it is, and the sides are chosen from
    // the elements that are actually there.
    const spots = () => {
      const on = spotsShowAt(map.getZoom());
      const has = map.hasLayer(spotLayer);
      if (on === has) return;
      if (on) spotLayer.addTo(map); else map.removeLayer(spotLayer);
      layOut();
    };
    map.on("zoomend", spots);
    spots();
    // Now rather than on a landing that may never come: a pin added inside the
    // picture moves no camera, and its label still has to be placed. Every
    // move that does happen re-runs this from the moveend listener above.
    layOut();

    const shut = () => map.closePopup();
    map.getContainer().addEventListener("mouseleave", shut);
    cleanRef.current = () => {
      map.getContainer().removeEventListener("mouseleave", shut);
      map.off("moveend zoomend", layOut);
      map.off("zoomend", spots);
    };
    requestAnimationFrame(() => map.invalidateSize());
    // pinKey, not `pins`: by value, for the reason above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey]);

  // ── AND THE REPLY CAN MOVE IT WHILE IT TALKS ──────────────────────
  //
  // Oliver, 12 Sep 2026, on how he wants this to work: "Arh, [zoom in]
  // Copenhagen has alot to offer... Interesting! [zoom out], well for your
  // specific taste, I can recommend Aarhus [zoom in] because bla bla bla."
  //
  // The brackets are inside his sentences, so the move belongs to a word rather
  // than to a reply. utils/mapDirections.js reads the markers out of the text
  // and the caller fires one as the reveal reaches it; this effect is the half
  // that flies, and it knows nothing about text.
  //
  // KEYED ON seq AND NOT ON THE TARGET. Two beats naming the same place is a
  // real sequence ("Copenhagen... and back to Copenhagen"), and a key made of
  // the coordinates would collapse them into one and the second move would
  // never happen. seq is a counter the caller bumps per beat.
  //
  // THROUGH THE SAME QUEUE AS THE PINS' MOVES, which is where the animation
  // was broken. This used to call flyTo directly, and so did the pin effect, and
  // Leaflet's flyTo cancels the flight before it: his own example, an OUT and
  // an IN eight words apart, played as a quarter of a second of pulling back
  // and then the dive, because the reveal reaches eight words in well under a
  // second and the pull-back takes 1.9. Now the OUT lands, holds, and THEN the
  // IN plays. And the reply still wins over the app: a fit that is playing is
  // interrupted by a beat, and a fit never displaces one.
  const focusSeq = focus ? focus.seq : null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus || focusSeq == null) return;
    const cam = camRef.current;
    if (!cam) return;
    if (focus.kind === "out") { cam.arrive({ kind: "out" }); return; }
    if (!Number.isFinite(focus.lat) || !Number.isFinite(focus.lon)) return;
    cam.arrive({ kind: "in", lat: focus.lat, lon: focus.lon });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSeq]);

  useEffect(() => () => {
    camRef.current?.stop();
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
  }, []);

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
          // Built per render, so a Yes shows as its state on the next paint
          // without the pins being redrawn. `h.asks` was decided when the pin
          // was made and `ask` is live: both have to hold, because the render
          // between the gate shutting and the effect catching up still has the
          // old hosts.
          ask={ask && h.asks ? {
            picked: (Array.isArray(ask.picked) ? ask.picked : []).includes(h.place?.name),
            caution: typeof ask.cautionFor === "function" ? String(ask.cautionFor(h.place) || "") : "",
            onYes: () => { if (typeof ask.onYes === "function") ask.onYes(h.place); },
            onNo: () => { if (typeof ask.onNo === "function") ask.onNo(h.place); },
          } : null}
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
      {/* ── WHAT A NO TOOK OFF THE MAP, SAID OUT LOUD ──────────────
          The pin is gone, and a pin that is gone looks exactly like a place
          Gemlyx never had. So the names sit here, each one a button that
          withdraws the No: a tap is the easiest thing in this app to do by
          mistake, and a refusal nobody can see or undo is the constraint that
          "vanishes without a word", which exclusions.js calls Layla's whole
          problem. Shown whether or not the gate is still open, because the No
          was made when it was and still holds. */}
      {(Array.isArray(turnedDown) ? turnedDown : []).filter(Boolean).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 4, fontSize: 10, color: C?.muted || "#9AA3BC", lineHeight: 1.5 }}>
          <span>{uiT("map.leftOut", uiCode)}</span>
          {(Array.isArray(turnedDown) ? turnedDown : []).filter(Boolean).map(name => (
            <button key={name} type="button"
              onClick={() => { if (typeof onRestore === "function") onRestore(name); }}
              style={{ background: "none", border: `1px solid ${C?.border || "#2A3350"}`, color: C?.text || "#EFE9D6", borderRadius: 100, padding: "1px 7px", fontSize: 10, cursor: "pointer", fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
              {name} {"\u2715"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
