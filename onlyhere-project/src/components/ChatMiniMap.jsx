import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { addTileLayer } from "../utils/mapTiles";
import { ChatPlaceCards, showablePhoto } from "./ChatPlaceCards";
import { POPUP_CLASS, RAIL_BREAKPOINT_PX, LABEL_CLASS, CORNER_CLASS, DOT_GREEN, labelSides, isSpotPin, spotsShowAt, phoneMapOpen, placesAround } from "../utils/chatRail";
import { distinctThemes, THEME_LABEL } from "../utils/placeThemes";
import { entryWord } from "../utils/entryWords";
import { makeCamera, unplayedBeat } from "../utils/mapDirections";
import { partFrameFor } from "../utils/geography";
import { cardLine } from "../utils/cardLine";
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
// builds the map when its box appears and not again while the box is there,
// and a second that clears a layer group and draws into it.
// Skagen down to the German border, Blåvand across to Bornholm. Framed by
// fitBounds rather than by a hand-picked zoom, so a 210px column and a 300px
// one both get the country instead of one of them getting Jutland.
const DENMARK = [[54.5, 8.0], [57.8, 15.3]];

// ── UNLESS THE WHOLE TRIP IS ON ONE LANDMASS ────────────────────────
//
// Oliver, 19 Sep 2026: "if the AI concludes that it is going to make a
// Zealand-only or a Jutland-only trip, then it should zoom into a zealand-only
// map or a jutland-only map."
//
// One reader, called from the three places that ask "how wide is wide": the
// frame the map opens on, the frame a pull-back lands on, and the box frameFor
// compares the view against. Those three disagreeing is how the camera ends up
// pulling back to a picture it then decides is wrong and pulling back again.
// partFrameFor is in geography.js, off the same outlines that decide which
// landmass a place is on.
const wideBounds = (pins) => {
  const box = partFrameFor(pins);
  return box ? [[box.south, box.west], [box.north, box.east]] : DENMARK;
};

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
// The ball on an ordinary pin, in pixels. The newest place gets the same pin
// larger rather than a second colour, which is the rule the teardrop set.
// ── HALVED, 14 SEP 2026 ─────────────────────────────────────────────
// "I like the pins, although maybe they should be ½ size." This is the only
// number that decides it; the needle and the tilt are ratios off it, so the
// whole pin scales from here.
const PIN_HEAD_PX = 6;
// The needle, in ball diameters. Life is 2.7 and looks like a matchstick at this
// size; 2.1 keeps the pin under 40px tall, which matters on the 190px phone strip.
const PIN_REACH = 2.1;
const PIN_TILT = 10;
// Each gradient needs an id of its own or every pin on the map inherits the
// first one's, which is a single shared ball that never changes size.
let pinSeq = 0;
// ── THE MARKING PIN ─────────────────────────────────────────────────
// Returns the markup and the three numbers Leaflet needs: the box, the point
// inside it that sits on the coordinate, and how much of the pin stands above
// that point, which is what the label layout measures against.
const pushPin = (r, latest, id) => {
  const L2 = r * PIN_REACH * 2;
  const topW = r * 0.5, pad = r * 0.95;
  const w = Math.ceil(r * 2 + pad * 2), h = Math.ceil(r + L2 + pad * 2);
  const cx = w / 2, cy = pad + r, tip = cy + L2;
  const glow = latest ? ` drop-shadow(0 0 ${(r * 0.8).toFixed(1)}px ${PIN_RED}77)` : "";
  return { w, h, cx, tip, above: Math.round(L2 + r),
    svg: `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible;`
      + `filter:drop-shadow(${(r * 0.3).toFixed(1)}px ${(r * 0.45).toFixed(1)}px ${(r * 0.45).toFixed(1)}px rgba(0,0,0,.62))${glow};${latest ? "" : "opacity:.88;"}">`
      + `<defs><radialGradient id="${id}b" cx="33%" cy="28%" r="75%">`
      + `<stop offset="0%" stop-color="#FF9A93"/><stop offset="38%" stop-color="${PIN_RED}"/>`
      + `<stop offset="100%" stop-color="#7A0E13"/></radialGradient>`
      + `<linearGradient id="${id}n" x1="0" y1="0" x2="1" y2="0">`
      + `<stop offset="0%" stop-color="#8892A6"/><stop offset="34%" stop-color="#F2F5FA"/>`
      + `<stop offset="68%" stop-color="#AAB4C6"/><stop offset="100%" stop-color="#636B7D"/></linearGradient></defs>`
      + `<g transform="rotate(${PIN_TILT} ${cx} ${tip})">`
      + `<path d="M${cx - topW} ${cy} L${cx + topW} ${cy} L${cx + topW * 0.1} ${tip} L${cx - topW * 0.1} ${tip} Z" fill="url(#${id}n)"/>`
      + `<path d="M${cx + topW} ${cy} L${cx + topW * 0.1} ${tip} L${cx - topW * 0.1} ${tip} Z" fill="#0A0F1E" opacity=".3"/>`
      + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}b)" stroke="#0A0F1E" stroke-width="${(r * 0.11).toFixed(2)}" stroke-opacity=".7"/>`
      + `<ellipse cx="${cx - r * 0.3}" cy="${cy - r * 0.36}" rx="${(r * 0.34).toFixed(2)}" ry="${(r * 0.24).toFixed(2)}" fill="#fff" opacity=".78"`
      + ` transform="rotate(-30 ${cx - r * 0.3} ${cy - r * 0.36})"/>`
      + `</g></svg>` };
};

// ── AND THE ONE THAT IS ONLY BEING CONSIDERED ───────────────────────
//
// Oliver, 19 Sep 2026: "the pointer on maps should only be if it's confirmed.
// The places that are being considered should be green dots instead. We need to
// prevent the map from looking like a mess."
//
// A DOT RATHER THAN A SMALLER PIN, which was the other way to draw this and is
// the wrong one. The pin's whole argument, written above at length, is that its
// TIP sits on the coordinate and its body stands above it: it points at a spot
// somebody chose. A smaller pin says the same thing more quietly, and what this
// has to say is different in kind rather than in degree. A dot sits ON the map
// and claims nothing beyond being there, which is exactly what a place Gemlyx
// has mentioned and nobody has picked up amounts to.
//
// GREEN, his word, and it carries on a dark map without competing with the red:
// the two are the furthest apart the eye has, and neither is the site's gold.
// The value is in chatRail.js beside the CSS that pulses it and paints the same
// green in the corner label, because a dot drawn here in one green and named
// over there in another is two greens meaning one thing.
//
// Centred on its coordinate, unlike the pin, because a dot has no tip.
const DOT_PX = 7;
const consideredDot = (r, latest) => {
  const pad = Math.ceil(r * 0.9);
  const w = Math.ceil(r * 2 + pad * 2), c = w / 2;
  return { w, h: w, cx: c, tip: c, above: Math.round(r + pad),
    svg: `<svg width="${w}" height="${w}" viewBox="0 0 ${w} ${w}" style="display:block;overflow:visible;`
      + `filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.55));${latest ? "" : "opacity:.8;"}">`
      + `<circle cx="${c}" cy="${c}" r="${r}" fill="${DOT_GREEN}" fill-opacity=".92"`
      + ` stroke="#0A0F1E" stroke-width="${(r * 0.22).toFixed(2)}" stroke-opacity=".55"/>`
      + `</svg>` };
};

// A pin is a claim, a dot is an offer. One reader, so the marker, the route line
// and anything that comes later cannot disagree about which is which.
export const isConsidered = (pin) => !pin?.confirmed;

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
export const ChatMiniMap = ({ pins = [], dropped = 0, C, onOpen, lang = null, height = 220, sayWhatFor = false, focus = null, ask = null, turnedDown = [], onRestore = null, phoneOpen = false, unsure = false, around = [] }) => {
  // The published places a flight down brings with it. See placesAround.
  const aroundRef = useRef(around);
  aroundRef.current = around;
  const aroundLayerRef = useRef(null);
  const landTimerRef = useRef(null);
  const [cardOpen, setCardOpen] = useState(false);
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
  // ── AND THEN THE PHONE GOT A MAP, 13 SEP 2026 ─────────────────────
  //
  // Oliver: "the phone still doesn't have the map implemented." The stacked
  // rule in chatRail.js answered that with a 190px rail under the
  // conversation, shown from two pins, and measured at 390 by 844 it shipped
  // a blank strip: this component still returned null below the breakpoint,
  // so the rail had its height and nothing in it.
  //
  // So `wide` is no longer the whole of "is anybody looking". It is the wide
  // column, which always has a map; below it the map exists exactly when the
  // rail does, which is phoneMapShows, the one rule App.jsx puts the has-map
  // class on. The concern above is kept whole by that: a map is built only
  // when the box it goes in is on screen and has a size, so no Leaflet ever
  // measures a display:none rail. And flownRef needs no new decision, because
  // it is gone: nothing flies on its own any more, the map opens on the
  // country wherever it is built and the reply's beats are the only descent,
  // so a phone map built mid-conversation opens on Denmark like a desktop one.
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
  // `confirmed` is in the key because a green dot turning into a pin is a
  // redraw. Left out, the marker would keep its old shape until some other
  // change happened to move the key, and the turn where they say yes is exactly
  // the turn somebody is watching.
  const pinKey = list.map(p => `${p?.key}@${p?.lat},${p?.lon}${p?.latest ? "*" : ""}${p?.confirmed ? "!" : ""}`).join("|")
    + (asking ? "|ask" : "") + (unsure ? "|unsure" : "");
  // ── THE MAP IS THERE BEFORE THERE IS ANYTHING ON IT ───────────────
  // Oliver, 8 Sep 2026: "I think map should already be shown from start."
  // It was gated on having a pin, so the panel was empty until Gemlyx happened
  // to name somewhere and then a map appeared out of nowhere mid-conversation.
  // A map of Denmark with nothing on it is not an empty state, it is the
  // context every pin is about to be placed in, and it is the thing that says
  // what this column is for without a sentence explaining it.
  //
  // That is the wide column. A phone has no column to keep open, so there the
  // map appears with the rail, from two pins: the same rule, phoneMapShows,
  // that App.jsx puts the has-map class on, so the box and the map in it
  // cannot disagree about whether there is one.
  // ── AND ON A PHONE IT IS OPENED RATHER THAN GIVEN, 19 SEP 2026 ──
  //
  // Oliver: "on phone, we gotta have a 'show map' button." phoneMapOpen is the
  // same reader App.jsx puts the has-map class on, so the box and the map in it
  // still cannot disagree, which is the whole reason phoneMapShows was written
  // here rather than in two places. `phoneOpen` defaults to false, so a caller
  // that has not been taught about the button gets no map on a phone rather
  // than a map nobody asked for.
  const shown = wide || phoneMapOpen(list, phoneOpen);

  // ── WHAT THE CORNER SAYS ────────────────────────────────────────
  //
  // The newest thing being considered, and how many others there are. `latest`
  // is the flag mapPlaces already sets on whatever the last turn named, so the
  // corner follows the conversation rather than the order the pins happen to be
  // in. Nothing named in the last turn leaves the most recently added dot,
  // which is the end of the list: `order` in mapPlaces is first-mention order,
  // so the last dot is the newest suggestion still standing.
  const dots = list.filter(isConsidered);
  const newestDot = dots.filter(p => p.latest).slice(-1)[0] || dots.slice(-1)[0] || null;
  // ── AND A SHORT WRITING OF IT, 19 SEP 2026 ──────────────────────
  //
  // Oliver: "You zoom in, and you have a short writing of it on the maps."
  //
  // cardLine is the reader the preview and the pin card already use, so the
  // three places that describe one row describe it the same way. It picks the
  // sentence that answers "is this for me" over the founding date the paragraph
  // opens with, and it is empty for a row with no usable text, in which case the
  // corner is the name alone rather than a sentence made up to fill it.
  const corner = newestDot
    ? {
        name: newestDot.place?.name || "",
        line: cardLine(newestDot.place) || "",
        more: Math.max(0, dots.length - 1),
      }
    : null;

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
      ? L.latLngBounds(wideBounds(pinsNowRef.current))
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
      // THE SAME BOX THE PULL-BACK USES. frameFor asks "is the view already
      // holding everything", and answering that against the country while the
      // camera lands on Zealand would have it ask for a frame it just made.
      country: (() => {
        const w = wideBounds(pinsNowRef.current);
        return { south: w[0][0], west: w[0][1], north: w[1][0], east: w[1][1] };
      })(),
    };
  };

  // ── MOUNT ────────────────────────────────────────────────────────
  //
  // KEYED ON shown, WHICH IS WHEN THERE IS A BOX TO BUILD IN. It was keyed on
  // `any`, the pins being non-empty on a wide screen, a leftover from when
  // the map was gated on having a pin, and it cost two things that were
  // measured before it changed. On a desktop the map was torn down and built
  // again on the reply that named the first town, tiles and all: two map
  // builds logged in one conversation. On a phone it could never build at
  // all, because `any` is false below the breakpoint and an effect whose deps
  // never change never re-runs, so the phone rail stayed empty. The map is
  // built when the box appears and removed when it goes, and nothing else.
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
    // AND THE SAME READER AT MOUNT, so a map built while the conversation is
    // already three Zealand stops in opens on Zealand rather than opening on
    // the country and then correcting itself in front of somebody.
    }).fitBounds(wideBounds(list), { padding: [6, 6] });
    addTileLayer(L, map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    // Not added here. The map opens on the whole of Denmark, where by
    // definition no attraction is worth drawing, and the zoom watcher below
    // puts it on the moment the view is close enough.
    spotLayerRef.current = L.layerGroup();
    mapRef.current = map;
    map.on("popupopen", () => setCardOpen(true));
    map.on("popupclose", () => setCardOpen(false));
    camRef.current = makeCamera({ play: (move) => applyMove(map, move), picture: () => pictureOf(map) });
    // Leaflet measures its container the instant L.map() runs, and this one
    // mounts inside a panel whose layout is still settling. Same settle problem
    // the guide map and the place map both hit.
    requestAnimationFrame(() => map.invalidateSize());
    const t = setTimeout(() => map.invalidateSize(), 400);
    // ── AND IT KEEPS MEASURING, BECAUSE THE BOX KEEPS CHANGING ─────
    //
    // Leaflet reads its container once and on window resize, and nothing
    // else. This box changes without the window: the desktop rail is as tall
    // as the conversation beside it and grows with every reply, and the phone
    // rail is a 190px strip that appears with the second pin. A map with a
    // stale size draws its tiles for the old box and leaves the new part
    // grey, which is the commonest way a phone map ships broken. So the box
    // itself is watched, and every change re-measures. Guarded, because a
    // browser without ResizeObserver still has the two calls above.
    const watch = typeof ResizeObserver === "function"
      ? new ResizeObserver(() => { if (mapRef.current === map) map.invalidateSize(); })
      : null;
    if (watch) watch.observe(holderRef.current);
    return () => {
      clearTimeout(t);
      if (watch) watch.disconnect();
      camRef.current?.stop();
      camRef.current = null;
      map.remove(); mapRef.current = null; layerRef.current = null; spotLayerRef.current = null;
    };
  }, [shown]);

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
    // the turn that names the most places and knows the least. Open, every pin
    // is still a name until the pointer lands on it: since 13 Sep the word
    // shows on that one pin and no other, see the label below.
    const picked = sayWhatFor ? distinctThemes(list.map(p => ({ key: p.key, themes: p.place?.themes }))) : {};
    const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    // The newest ones last, so they are drawn on top of anything they overlap.
    // Not numbered: mention order is not itinerary order, and a numbered pin
    // asserts a route nobody has agreed to. mapPlaces says why at length.
    // And the dots go under the pins, for the same reason the towns go under
    // the attractions: where the two land on top of each other, the one that
    // says more should be the one you can see.
    const ordered = [...list].sort((a, b) =>
      (Number(!!a.confirmed) - Number(!!b.confirmed)) || (Number(!!a.latest) - Number(!!b.latest)));
    // ── AND THE LINE BETWEEN THE ONES THEY HAVE PICKED ──────────────
    //
    // Oliver, 19 Sep 2026, in the same breath as the dots: "That could also
    // make us draw a line between the pointers as a 'route'."
    //
    // CONFIRMED ONLY, which is what makes it drawable at all. A line through
    // everything Gemlyx has ever mentioned would be the mess the dots exist to
    // prevent, redrawn in one stroke.
    //
    // AND DASHED, THIN, UNDER EVERYTHING. The note above `ordered` has said
    // since 8 Sep that mention order is not itinerary order and that a numbered
    // pin asserts a route nobody has agreed to. That is still true and it is the
    // reason for the weight: this joins the places they have named, in the order
    // they named them, and it is drawn as a thread rather than as a road so it
    // cannot be read as day one to day two. The real answer is routeOrder.js
    // once an arrival anchor exists, and the preview screen already orders its
    // towns that way.
    // `> 1` because a line needs two ends, which is geometry rather than a
    // threshold. The phone's two-pin rule is PHONE_MAP_PINS and lives in
    // chatRail.js, and the suite holds this file to not keeping a copy of it.
    const walked = list.filter(p => !isConsidered(p));
    if (walked.length > 1) {
      L.polyline(walked.map(p => [p.lat, p.lon]), {
        color: PIN_RED, weight: 1.5, opacity: 0.5, dashArray: "4 5",
        interactive: false, className: "gemlyx-chat-route",
      }).addTo(layer);
    }
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
      // ── AND THEN HE SENT A PHOTOGRAPH OF A REAL ONE ───────────
      //
      // Oliver, 13 Sep 2026, asked how to make the app look less old school
      // and named the pins himself. I answered that the teardrop above is the
      // 2008 Google Maps shape and that people read it as old before they read
      // anything else on the screen. He replied with a product photo: a box of
      // Markierungsnadeln, a 6mm glossy red ball on a 16mm steel needle, and
      // "is this possible?".
      //
      // It is, and it is better than the dot I had offered. A trip is planned
      // by sticking pins in a map, so the marker that says so is the object
      // itself rather than an icon of one. THE TIP IS STILL THE ANCHOR, which
      // is the half the teardrop already had right and a circle never can.
      //
      // THE NEEDLE IS SHORTER THAN LIFE. The real article is 2.7 ball
      // diameters of needle. Rendered at map size that reads as a matchstick,
      // so `reach` is the compromise, measured at 4x and at 11px before being
      // written down here.
      //
      // TILTED, because a pin somebody pushed in is never upright, and the
      // shadow falls down and to the right so it sits ON the map rather than
      // printed on it.
      const dot = isConsidered(p);
      const r = dot
        ? (p.latest ? DOT_PX * 1.3 : DOT_PX) / 2
        : (p.latest ? PIN_HEAD_PX * 1.36 : PIN_HEAD_PX) / 2;
      const pin = dot ? consideredDot(r, p.latest) : pushPin(r, p.latest, `p${pinSeq++}`);
      const h = pin.above;   // what stands above the coordinate, for the labels
      const icon = L.divIcon({
        // ── AND THE DOT BREATHES, 19 SEP 2026 ────────────────────
        // Oliver: "what about the dot becomes a little blinking greendot".
        // A pin is a thing somebody pushed in and it sits still; a dot is a
        // thing being offered, and the pulse is what says it is waiting for an
        // answer rather than being part of the plan. The animation is in
        // railMapCss so it can be turned off for reduced motion in one place.
        className: dot ? "gemlyx-chat-pin gemlyx-chat-dot" : "gemlyx-chat-pin",
        html: pin.svg,
        iconSize: [pin.w, pin.h], iconAnchor: [pin.cx, pin.tip],
      });
      const marker = L.marker([p.lat, p.lon], {
        icon,
        title: p.place?.name || "",
        keyboard: false,
        zIndexOffset: p.latest ? 1000 : 0,
      }).addTo(isSpotPin(p) ? spotLayer : layer);
      // ── AND WHAT IT IS FOR ──────────────────────────────────────
      //
      // Oliver, 9 Sep 2026, on a reply that had offered him three cities with
      // one card open over Aarhus: "is it possible to include what the city is
      // best for? When given options like that", then "have all of them shown
      // (without overlapping oneanother)". This heading read "without anybody
      // having to tap" until 13 Sep; see the block below the word for what
      // moved and why.
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
      // ── AND ONLY ON THE PIN THE READER IS POINTING AT ─────────
      //
      // Oliver, 13 Sep 2026, on a map of Denmark with five pins each carrying
      // its word, Billund / Family, Copenhagen / Food, Ribe / Coast, Odense /
      // History: "Those categories popping up is akward."
      //
      // The gate above (sayWhatFor, unsureWhatTheyWant in App.jsx) was
      // already shut for anybody who had named a theme of their own, and it
      // was open in that session. So the gate is right and the render inside
      // it was still wrong: five words at once over a 380px map are a stack
      // of chips, and a chip nobody asked about explains nothing. The 9 Sep
      // ask this was built for, "have all of them shown", is the ask he has
      // walked back three times since ("only for when someone is in doubt",
      // "awkward to have on all the time", and this).
      //
      // So the label every pin always carries is the NAME, and the word joins
      // it only while the pointer is on that pin. That is the gesture the map
      // already has for "tell me about this one": hovering opens the card,
      // and on a place inside a town it opens the "Is this interesting?"
      // question. One pin at a time, on the same movement, rather than a
      // second affordance beside it. The word still comes from the row's own
      // themes, chosen across the set, in the reader's language, and it is
      // still nothing at all for a row carrying no themes.
      //
      // setContent rather than a second tooltip: the label keeps the side
      // layOut chose for it and grows in place, and it is measured with the
      // name alone, which is the size it has on every pin but the one under
      // the cursor.
      // ── AND A DOT CARRIES NO LABEL, 19 SEP 2026 ───────────────
      //
      // "the suggested place shows in the left corner of the map. We need to
      // prevent the map from looking like a mess."
      //
      // Which is the other half of the dot. Six labels on a 380px map is the
      // mess, and the labels that have to stay are the ones on places somebody
      // has actually chosen. A suggestion still gets named, once, in the corner
      // below, where one line of text costs nothing wherever the dot happens to
      // be sitting.
      //
      // THE LABEL ONLY. Everything under this still happens to a dot: the card,
      // the question on it and the press that opens the entry are the whole
      // point of a place being offered, and an early return here would have
      // taken all three away with the label.
      if (!dot) {
        const nameHtml = `<span class="pin-name">${esc(p.place?.name || "")}</span>`;
        marker.bindTooltip(nameHtml,
          { permanent: true, direction: "top", className: LABEL_CLASS,
            opacity: 1, interactive: false, offset: [0, -h] });
        if (best) {
          const withWord = nameHtml + `<span class="pin-best">${esc(best)}</span>`;
          marker.on("mouseover", () => marker.getTooltip()?.setContent(withWord));
          marker.on("mouseout", () => marker.getTooltip()?.setContent(nameHtml));
        }
        labelled.push({ key: p.key, ph: h, marker });
      }

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
      // closure like `code` above: both `asking` and `unsure` are in pinKey, so
      // this effect re-runs when either changes.
      // ── AND A DOT HAS TO HAVE A WAY OF BECOMING A PIN ─────────
      //
      // Oliver, 19 Sep 2026: "the AI should set up a form of confirmation for
      // it. Like 'is that interesting to you?'" And, deciding what counts:
      // "in order to go from a green dot to a confirmed point, you need it
      // confirmed. And just talking about it, won't confirm it."
      //
      // Those two together make the question load-bearing. A Yes is now the
      // ONLY thing that turns an offer into a stop, so a considered place with
      // no question on it is an offer nobody can take. It asks whether or not
      // the uncertainty gate is open, and whether or not it is a place inside a
      // town: a suggested TOWN could never be confirmed before this line,
      // because the old rule only ever asked about spots.
      //
      // AND NEVER ON A CONFIRMED ONE. That is the 13 Sep complaint about the
      // categories being "awkward to have on all the time": a question over
      // somewhere they have already chosen is asking them to decide something
      // they decided. The gate still governs those.
      const asks = isConsidered(p) || (unsure && isSpotPin(p));
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
      // ── AND A TAP MUST NOT OPEN IT AND SHUT IT IN ONE GO ───────
      //
      // Measured on the phone build, 13 Sep 2026, with every event on the
      // icon logged: a tap is touchstart, touchend, and then the browser's
      // own mouseover, mousemove, mousedown, mouseup and click on the same
      // element. The hover handler below opened the card on the mouseover,
      // and the click handler bindPopup attaches, which TOGGLES, closed it
      // again on the click, so the card was on screen for a frame and gone
      // before the thumb had lifted. "Is this interesting?" could not be
      // reached by tapping at all, on a phone or on a touch laptop.
      //
      // So Leaflet's toggle comes off, and the pointer's own handler opens
      // the card on a click as well as on a hover, which is what the sentence
      // under it has said the click was for since the day it was written. A
      // click on a card already open leaves it open; the close button and
      // leaving the map are how it shuts. Guarded on the method existing,
      // because it is Leaflet's own name for its handler rather than part of
      // its documented surface: a Leaflet that renames it keeps the toggle
      // and loses only the tap, never the map.
      if (typeof marker._openPopup === "function") marker.off("click", marker._openPopup, marker);
      // ── HOVER OPENS IT, WHICH IS WHY THIS IS NOT CLICK-ONLY ─────
      //
      // Measured in a real browser before writing this: on a 138 by 192 map an
      // open card covers about half of it, and Playwright could not reach the
      // second pin at all: "<div>Aarhus</div> ... intercepts pointer events".
      // A person can close it and tap again; that is two taps to compare two
      // places, on the feature whose whole point is comparing places.
      //
      // Above 900px (chatRail's breakpoint) this is a pointer device, so
      // hovering swaps the card with no clicks at all and the covering never
      // happens. Click opens it for a touch laptop and for the phone, and
      // closeButton stays for the same reason.
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
      marker.on("mouseover click", (e) => {
        // ── AND A CARD ALREADY OPEN IS LEFT WHERE IT IS ─────────────
        // Oliver, 22 Sep 2026: "It does some jump jump jump when I have my
        // mouse on it." Opening a card pans the map to fit it, the pan slides
        // the pin back under the pointer, that is a fresh mouseover, and every
        // mouseover opened the card again with its side counted again from
        // where the pins had moved to. The side could flip, the map panned the
        // other way, and so on for as long as the pointer rested there. A
        // hover on the pin whose card is already open changes nothing now.
        if (e?.type === "mouseover" && marker.isPopupOpen()) return;
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
          // update() moves the card and does not pan for it, so a card that
          // grew past the top of the map stayed cut off there. Leaflet's own
          // pan-to-fit, run again for the card as it now is.
          if (typeof pop._adjustPan === "function") pop._adjustPan();
        }
      });
      // NOT on the marker's own mouseout: the card sits directly above the pin,
      // so moving towards it leaves the marker, and closing there would make
      // the card impossible to reach. The container's pointerleave below is
      // the honest boundary, because the card is inside the container.
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
    // ── AND THE ZOOM IS THE REPLY'S, NOT THE PINS' ──────────────
    //
    // For an hour on 19 Sep this flew the map down to any place inside a town
    // that Gemlyx had just named, so that a suggestion could not be named in
    // the corner while the map sat on the whole country with nothing to look
    // at. Oliver stopped it: "You don't zoom in all the time. But you zoom in
    // if you want to say 'Arh, if you go to Billund, I can recommend bla bla
    // bla [zoom in]. [Add to trip / Not interested] [Zoom out]'."
    //
    // Which is the rule this file has carried since 12 Sep and I had started
    // writing a second copy of: the pins do not choose a closeness, the REPLY
    // does, with [[MAP_IN:...]] at the word it belongs to. A recommendation is
    // a sentence Gemlyx is writing, and only Gemlyx knows whether it is making
    // one. The prompt now says so in as many words, in MAP_DIRECTION_RULE, and
    // the choice on the pin and the pull-back after it are the other two beats
    // of the same move.
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

    // ── AND A LIFTED FINGER IS NOT A POINTER LEAVING ───────────
    //
    // Measured on the phone build, 13 Sep 2026, with the closers traced: a
    // tap on a pin opened the card, and then the container's mouseleave
    // fired six times and shut it, because a touch has no position once the
    // finger is up and the browser says so with the same event a mouse
    // sends when it rolls off the map. So the card was gone before it could
    // be read, and on a phone nothing else was ever going to open it.
    //
    // pointerleave rather than mouseleave, because it names what left. A
    // mouse leaving the map still takes the card down, which is the boundary
    // the note above chose over the marker's own mouseout; a finger lifting
    // leaves the card where it is, and the close button on it is how a phone
    // shuts it.
    const shut = (e) => { if (e && e.pointerType === "touch") return; map.closePopup(); };
    map.getContainer().addEventListener("pointerleave", shut);
    cleanRef.current = () => {
      map.getContainer().removeEventListener("pointerleave", shut);
      map.off("moveend zoomend", layOut);
      map.off("zoomend", spots);
    };
    requestAnimationFrame(() => map.invalidateSize());
    // pinKey, not `pins`: by value, for the reason above.
    // ── AND shown, BECAUSE A NEW MAP HAS NOTHING DRAWN ON IT ───────
    // The mount effect builds the map when `shown` turns true and removes it
    // when it turns false, and a map built with the same pins as before is
    // still a map with no markers on it. This effect runs on the same commit
    // the box appears, after the mount effect in declaration order, so the
    // phone map that arrives with the second pin is drawn on the frame it is
    // built, and a desktop map rebuilt after a rotation gets its pins back
    // without waiting for the next reply to change them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey, shown]);

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
  // ── AND A MAP THAT WAS NOT THERE WHEN THE WORD ARRIVED DOES NOT PLAY IT ──
  //
  // Oliver, 13 Sep 2026: "from start, it just randomly zoomed into Copenhagen
  // before even moving on from 'Denmark'."
  //
  // Measured in a real browser before this was written, with the pins and the
  // camera logged. He had pressed "Clear it", typed an opening line that named
  // no town, and the map opened on Denmark and flew straight down to Copenhagen
  // with no pin on it at all. Nothing in the new conversation had said the
  // word. The beat was the previous conversation's: `focus` is state in App.jsx
  // and outlives this component, and React runs an effect on mount whatever
  // its deps say, so every map built after a beat had played it again as if the
  // reveal had just reached the word. Leaving the Detour page and coming back
  // did the same, because the page unmounts and the map is built anew.
  //
  // Two readers of one beat: the reveal, which fires it once on the word, and
  // this effect on mount, which fired it a second time on a map that was not
  // there when it was said. A beat is a move made once, by the map that was
  // there. A map built later opens on the country like any other, and the pins
  // effect keeps the picture honest from there. So the seq that was current
  // when this map was first rendered is remembered, and only a seq that arrives
  // AFTER it moves the camera: unplayedBeat in utils/mapDirections.js is the
  // rule, and this ref is the number it runs on. Remembered whether or not the
  // move could play, because a beat that arrived while there was no map to fly
  // is a beat for a word already gone.
  const playedSeqRef = useRef(focusSeq);
  useEffect(() => {
    const next = unplayedBeat(focusSeq, playedSeqRef.current);
    if (next == null) return;
    playedSeqRef.current = next;
    const map = mapRef.current;
    if (!map || !focus) return;
    const cam = camRef.current;
    if (!cam) return;
    // Whatever the last flight brought with it goes when the camera moves on.
    clearTimeout(landTimerRef.current);
    if (aroundLayerRef.current) { aroundLayerRef.current.remove(); aroundLayerRef.current = null; }
    if (focus.kind === "out") { cam.arrive({ kind: "out" }); return; }
    if (!Number.isFinite(focus.lat) || !Number.isFinite(focus.lon)) return;
    cam.arrive({ kind: "in", lat: focus.lat, lon: focus.lon });
    // ── AND THE AREA COMES WITH IT, AND THE CARD ASKS ──────────────
    // Oliver, 22 Sep 2026: zoom in, "see the area whole", and then "ask if it
    // looks good, while having the picture popping up and all the attractions
    // around it as well". The places around go on as small dots, and when the
    // flight has landed the place's own card opens, which for an offer is the
    // one carrying Add to trip and Not interested.
    const pinned = pinsNowRef.current.map(p => p.place?.name || p.key);
    const near = placesAround({ lat: focus.lat, lon: focus.lon }, aroundRef.current, { exclude: pinned });
    if (near.length) {
      const group = L.layerGroup();
      near.forEach(p => {
        L.circleMarker([p.lat, p.lon], { radius: 4.5, color: "#0A0F1E", weight: 1.5, fillColor: "#C9A84C", fillOpacity: 0.85 })
          .bindTooltip(String(p.name), { direction: "top", offset: [0, -4] })
          .on("click", () => openRef.current?.(p.place || p))
          .addTo(group);
      });
      group.addTo(map);
      aroundLayerRef.current = group;
    }
    const wanted = String(focus.name || "").trim().toLowerCase();
    // ON ARRIVAL, not on a guess at it. The camera can hold this move behind
    // one already playing, and a card opened mid flight was dragged along
    // by it and came to rest half off the top of the map on the live test.
    // So the card waits until the map is sitting over the place.
    const target = L.latLng(focus.lat, focus.lon);
    const tryOpen = (attempt) => {
      const m = mapRef.current;
      if (!m) return;
      if (m.distance(m.getCenter(), target) > 250 && attempt < 10) {
        landTimerRef.current = setTimeout(() => tryOpen(attempt + 1), 400);
        return;
      }
      for (const [key, marker] of markersRef.current) {
        const pin = pinsNowRef.current.find(p => p.key === key);
        const name = String(pin?.place?.name || key || "").trim().toLowerCase();
        if (name && name === wanted && marker.getPopup()) { marker.fire("click"); break; }
      }
    };
    landTimerRef.current = setTimeout(() => tryOpen(0), Math.round(IN_SECONDS * 1000) + 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSeq]);

  useEffect(() => () => {
    clearTimeout(landTimerRef.current);
    camRef.current?.stop();
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
  }, []);

  // A map nobody can see explains nothing at all. A narrow screen has no map
  // until there are two pins to relate, and then it has one under the
  // conversation; see `shown`. The inline cards under each reply are there at
  // every width, on the desktop beside the map and on the phone above it: a
  // card is the picture of one place a reply introduced, and the map is where
  // the places are in relation to each other, which a card cannot say.
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
      {/* ── THE MAP, AND THE ONE LINE OVER ITS CORNER ─────────────────
          The overlay is a SIBLING of the Leaflet container rather than a child
          of it. Leaflet owns everything inside that div and moves it around on
          every pan; a React node in there is a node React and Leaflet both
          think they are responsible for. So the two share a relative box and
          neither touches the other's children. */}
      <div style={{ position: "relative", display: "flex", flex: "1 1 auto", minHeight: wide ? height : 0 }}>
        <div
          ref={holderRef}
          // ── THE FLOOR IS THE COLUMN'S, NOT THE PHONE'S ──────────────
          // On the phone the rail says how tall it is (190px, in chatRail.js)
          // and a 220px floor inside a 190px box is a map spilling over the
          // input bar under it. There the box takes what the rail has, and the
          // floor is the wide column's alone.
          style={{ flex: "1 1 auto", minHeight: 0, borderRadius: 12, overflow: "hidden", border: `1px solid ${C?.border || "#2A3350"}` }}
        />
        {/* ── "THE SUGGESTED PLACE SHOWS IN THE LEFT CORNER" ──────────
            Oliver, 19 Sep 2026, in the same message as the blinking dot.

            THE NEWEST ONE, and a count for the rest. A list of every place
            Gemlyx has ever floated is the mess the dots were drawn to prevent,
            moved into a box; the one being offered right now is the one the
            reply is about, and the count says the others are still there
            without spending a line each on them.

            Nothing at all when nothing is being considered. */}
        {/* Not while a card is open: the card says the same thing, and the
            two sat on top of each other in the map's top corner. */}
        {corner && !cardOpen && (
          <div className={CORNER_CLASS}>
            <div className="corner-head">
              <span className="corner-dot" />
              <span className="corner-name">{corner.name}</span>
              {corner.more > 0 && <span className="corner-more">{`+${corner.more}`}</span>}
            </div>
            {corner.line && <div className="corner-line">{corner.line}</div>}
          </div>
        )}
      </div>
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
            // ── AND THEN THE MAP COMES BACK OUT, 19 SEP 2026 ──
            //
            // Oliver, writing the whole move in one line: "you zoom in if you
            // want to say 'Arh, if you go to Billund, I can recommend bla bla
            // bla [zoom in]. [Add to trip / Not interested] [Zoom out]'."
            //
            // The zoom in is the reply's, with a marker, and so is the pull
            // back when the reply knows it is finished with the place. This is
            // the other way the move can end: they answered it. A card that has
            // been answered has nothing left to show at street scale, and a map
            // left standing on a place they just said no to is the camera
            // sitting on nothing, which frameFor is already written about.
            //
            // Through the camera, so a reply's own move still outranks it: a
            // press that lands while Gemlyx is flying somewhere queues behind
            // it rather than fighting it.
            //
            // ONLY FROM CLOSE UP. A press on a country map is somebody ticking
            // a place off a wide picture, and pulling back from a picture that
            // is already wide is a move nobody asked for.
            onYes: () => {
              if (typeof ask.onYes === "function") ask.onYes(h.place);
              if (spotsShowAt(mapRef.current?.getZoom())) camRef.current?.arrive({ kind: "out" });
            },
            onNo: () => {
              if (typeof ask.onNo === "function") ask.onNo(h.place);
              if (spotsShowAt(mapRef.current?.getZoom())) camRef.current?.arrive({ kind: "out" });
            },
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
