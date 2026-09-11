// ── "THE SIDEPANEL IS PRIMARILY FOR THE MAP" ────────────────────────
//
// Oliver, 8 Sep 2026, looking at his own Detour screen: "look the chatbar
// travels to the South Pole because of all the pictures that pop up in the
// sidepanel. The sidepanel is primarily for the map. If you want pictures
// there, have them minimized. But I prefer having them put under the text
// instead."
//
// ── WHY THE CHAT BAR ENDED UP AT THE SOUTH POLE ─────────────────────
//
// The panel is a flex row. The message list is capped, and the rail was
// whatever its contents added up to: two photo cards at about 200 pixels each
// plus a 220 pixel map is roughly 640, so the RAIL set the height of the row
// and the progress line and the input bar were pushed down by 340 pixels of
// nothing. The taller the answer, the further down the box you type in.
//
// So the rail carries one thing now, and that thing is elastic. The map is as
// tall as the conversation beside it with a floor under it, which means the
// row can never be taller than the chat, and the space the cards were using
// goes to the map rather than to a gap.
//
// ── AND THE CARDS GO WHERE HE SAID ──────────────────────────────────
//
// Under the text, at every width, which is the layout ChatPlaceCards calls
// "row" and the one it was written for: "make it a small picture into the
// chat. Imagine you're talking to me and you want to show me a picture."
//
// That was already rendered and hidden by CSS above 900px. It is now simply
// not hidden. The walk that chose which reply the rail illustrated went with
// the rail: it answered "which ONE reply's places", and a card under each
// reply needs no such choice, because each reply illustrates itself.

// ── THE TWO CLASSES, AND WHAT EACH IS NOW FOR ───────────────────────
//
// These used to be a pair that had to hide each other: both were rendered and
// exactly one was displayed, because which one fitted was a question about the
// viewport that a media query answers for free on every resize.
//
// They are no longer alternatives. The inline cards show at every width, and
// the rail holds the map and nothing else, so there is no width at which the
// same photograph could appear twice. INLINE_CARDS_CLASS stays as the marker
// on the cards: it is how App.jsx says which of the two ChatPlaceCards call
// sites this is, and how the suite finds it.
export const RAIL_CLASS = "chat-rail";
export const INLINE_CARDS_CLASS = "chat-cards-inline";
export const RAIL_BREAKPOINT_PX = 900;

// ── THE WRAPPER ROUND A BUBBLE AND ITS PICTURES ─────────────────────
//
// It was called BESIDE_ROW_CLASS and it put the pictures in the 18% gutter to
// the right of the bubble, which is what Oliver asked for on 9 Sep: "you could
// put in a picture of the museum it is talking about. So it floats along with
// the text. And if it suggests others as well, then the individual pictures
// will just become smaller to avoid a chaos."
//
// THAT LAYOUT SOLVED THE ONE-PICTURE CASE AND LOST THE OTHER ONE. A gutter is
// 190px wide and unbounded downward, so several places ran DOWN it: two at 88px
// beside a 120px reply, and a third that had to be dropped to stop the stack
// pushing the next reply off the screen. Oliver, 10 Sep, looking at exactly
// that: "have the pictures going under its text. So if the AI mentions multiple
// attractions or towns, it will become a long horrizontal line, rather than
// vertical."
//
// So the pictures come back under the bubble at every width and run ACROSS when
// there is more than one, which costs the same height whether there are two or
// four. See ChatPlaceCards, which owns that shape. This class is now only what
// its CSS name always said: the row a message occupies.
export const MSG_ROW_CLASS = "chat-msg-row";

// ── HOW TALL THE WHOLE THING IS, WRITTEN ONCE ───────────────────────
//
// The message list caps itself here and the rail matches it, so a taller
// conversation is a taller map rather than a longer page. Two numbers would
// drift the moment either was tuned, and the drift is invisible until the row
// grows a gap again.
//
// A clamp rather than a number: 46vh is most of a laptop's remaining height
// once the header and the input bar are out, and both ends are pinned so a
// short window does not squeeze the conversation into four lines and a tall
// one does not turn the panel into the page.
export const CHAT_PANEL_HEIGHT = "clamp(300px, 46vh, 460px)";

// The CSS, generated here rather than typed into the style block, so the
// breakpoint above cannot drift from the rule below. Read by App.jsx's <style>.
export const railCss = () => `
        .chat-with-rail { display: flex; gap: 12px; align-items: stretch; }
        /* Stacked by default, which is the phone and which is what this was
           before: bubble, then picture underneath it. */
        /* ── AND A USER MESSAGE STILL SITS ON THE RIGHT ─────────
           Found by an adversarial review, 9 Sep 2026. This was
           align-items: flex-start with width: 100%, which on a phone (where
           the row is a COLUMN) pinned every bubble to the left and defeated
           the parent's own alignItems, because a full-width row leaves
           nothing to align. justify-content on a column does nothing, so the
           inline style App.jsx sets could not save it either.

           So the column inherits its alignment rather than asserting one, and
           the row is only full width where it is a row. Above the
           breakpoint the two live side by side and the width is the point;
           below it, the bubble is as wide as its own text and sits on
           whichever side the message list puts it. */
        .${MSG_ROW_CLASS} { display: flex; flex-direction: column; align-items: inherit; gap: 6px; max-width: 100%; }
        /* ── AND THE STRIP DOES NOT WRAP ────────────────────────────
           A second line of cards puts back the height the row exists to save,
           so a strip too wide for the column scrolls sideways instead. The bar
           itself is hidden: it sits under a photograph, it appears and vanishes
           as the pointer moves, and the cards running to the edge already say
           there is more. Firefox takes scrollbar-width from the inline style
           the component sets. */
        .${INLINE_CARDS_CLASS} { flex-wrap: nowrap; }
        .${INLINE_CARDS_CLASS}::-webkit-scrollbar { height: 0; }
        .${RAIL_CLASS} { display: none; }
        @media (min-width: ${RAIL_BREAKPOINT_PX}px) {
          /* ── THE RAIL IS THE MAP NOW, SO IT GETS THE ROOM ────────
             It was clamped at 300px wide because a 132px popup card had to
             leave usable map either side of it, and because the cards above
             the map were paying for width they did not need. The cards are
             gone. The card constraint still sets the FLOOR, and the ceiling
             goes up, because every pixel here is map.

             Oliver, 8 Sep 2026: "The map is not given enough space." */
          .${RAIL_CLASS} {
            display: flex; flex-direction: column; min-height: 0;
            flex: 0 0 clamp(240px, 30%, 380px);
          }
        }`;

// ── "IT COULD BE COOL IF A MAP WAS USED TO EXPLAIN" ─────────────────
//
// Oliver, 6 Sep 2026, next to a screenshot of Layla: "right now there is not
// much else than just chatting."
//
// THE PINS ARE NOT THE CARDS' PLACES, and the difference is the whole design.
// A card belongs to ONE reply, because a photo strip that accumulates becomes
// "a gallery with a sentence attached, and the sentence is the product." That
// reasoning is about DECORATION and it does not transfer: a map with one pin
// says almost nothing, because the thing a map is for is showing places in
// relation to each other. Two pins is where it starts being worth the space.
//
// So this walk is the opposite: every message, oldest first, keeping what it
// finds. He chose it over three narrower options, and what he chose it for was
// "the trip taking shape".
//
// BOTH SIDES OF THE CONVERSATION, unlike a card. A card skips a place the
// traveller named themselves, because they do not need introducing to somewhere
// they asked for. A map that leaves out the town they are flying into is simply
// wrong about the shape of the trip, so the caller drops that rule by not
// passing alreadyKnown, and this walk reads their turns too.
//
// NO NUMBERS ON THE PINS, and this is a rule rather than a style choice. Pins
// come out in the order they were first MENTIONED, and mention order is not
// itinerary order: Gemlyx can name Skagen while explaining why to start at
// Ribe. Numbering them would assert a route the conversation has not agreed on,
// in the most believable format there is, which is the same fault as a pin
// dropped on a guessed coordinate. The map shows WHERE, and the route map in
// the guide shows the order, once there is one.
export const MAP_PIN_CAP = 12;

// placesFor, rejectsFor and coordsFor are all injected: the matching rules live
// in chatPlaces/previewMatch and the coordinate resolver lives in
// guideEnrichment, and what has a bug in it if anything does is THE WALK.
// Calling them from here would drag previewMatch and six data files into a file
// that answers "which places, in what order". Handed three functions, this file is testable with
// no published rows, no pools and no data files at all.
//
// coordsFor in particular must be placeCoords and not a fresh `__lat ?? lat`
// read. Six copies of that read have been found in this codebase and five of
// them were wrong; a seventh written here would be the same bug in a new file.
export const mapPlaces = ({ messages = [], placesFor, rejectsFor, coordsFor, cap = MAP_PIN_CAP } = {}) => {
  const none = { pins: [], dropped: 0 };
  if (typeof placesFor !== "function" || typeof coordsFor !== "function") return none;
  const list = Array.isArray(messages) ? messages : [];
  const order = [];
  const byKey = new Map();
  let newest = new Set();
  for (const m of list) {
    if (!m || m.isError) continue;
    const text = String(m.text || "");
    if (!text.trim()) continue;
    const here = new Set();
    for (const p of (placesFor(text, m) || [])) {
      const key = String(p?.name || "").trim().toLowerCase();
      if (!key) continue;
      // ── NO COORDINATE, NO PIN ────────────────────────────────────
      // PlaceMiniMap's rule, and it matters more here because this map is
      // built from a conversation rather than from one row somebody checked.
      // A pin is a claim about where something is, and a plausible guess in
      // that format is the most believable way to be wrong.
      const at = coordsFor(p);
      if (!at) continue;
      here.add(key);
      if (!byKey.has(key)) order.push(key);
      byKey.set(key, { key, place: p, lat: at.lat, lon: at.lon });
    }
    // AFTER the additions, so a turn that both names and turns down the same
    // place lands on the refusal. placesNamedIn already skips it, and agreeing
    // twice is cheaper than depending on that from over here.
    if (typeof rejectsFor === "function") {
      for (const key of (rejectsFor(text, m) || [])) {
        const k = String(key || "").trim().toLowerCase();
        if (!k) continue;
        // ── AND OUT OF THE ORDER, NOT ONLY OUT OF THE MAP ─────────
        //
        // Found by an adversarial review. `order` is what decides the pins and
        // it kept the key, so a later re-mention passed the !byKey.has guard
        // and pushed the same key a SECOND time. "Ribe and Aarhus" / "not ribe"
        // / "actually Ribe deserves a second look" produced pins
        // [ribe, aarhus, ribe]: two markers on one coordinate, a duplicate
        // React key on the portals so only one card rendered, a markersRef
        // entry that could only reach one of them, and a cap that counted the
        // copy and dropped a real place to make room for it.
        const at = order.indexOf(k);
        if (at >= 0) order.splice(at, 1);
        byKey.delete(k);
        here.delete(k);
      }
    }
    if (here.size) newest = here;
  }
  const all = order.map(k => byKey.get(k)).filter(Boolean);
  // Over the cap, the OLDEST go. A trip that has grown past twelve stops is
  // being planned at its far end, and dropping the newest would take away the
  // pins that just appeared, which is the half he is looking at.
  const kept = all.slice(Math.max(0, all.length - Math.max(0, cap)));
  return {
    pins: kept.map(pin => ({ ...pin, latest: newest.has(pin.key) })),
    // Said rather than swallowed, so the caption can admit the map is not the
    // whole conversation instead of quietly being a different trip.
    dropped: all.length - kept.length,
  };
};

export const MAP_CLASS = "chat-rail-map";

// The whole of the side column, which is what he picked on 8 Sep: "The
// sidepanel is primarily for the map." Only at the rail breakpoint: below it
// there is no column to put a map in, and a map stacked into a phone panel
// pushes the reply off the top.
export const POPUP_CLASS = "gemlyx-chat-popup";
// Every pin carries one of these, always. labelSides at the foot of this file
// decides where each one goes and says why it is a label rather than the card.
export const LABEL_CLASS = "gemlyx-pin-label";

// ── THE POPUP IS THE CARD, SO LEAFLET'S CHROME HAS TO GET OUT ───────
//
// Leaflet draws a popup as a white rounded box with its own padding and a
// white tip below it, which is right on a light map and wrong wrapped round a
// card that already has its own surface, border and corners.
//
// EVERY RULE HERE IS SCOPED UNDER .${POPUP_CLASS}, which Leaflet puts on the
// popup this map binds and on no other. Writing these against the bare
// .leaflet-popup-* classes would restyle the place page's map and the guide's
// route map too, from a file neither of them imports.
export const railMapCss = (C = {}) => `
        .${MAP_CLASS} { display: none; }
        @media (min-width: ${RAIL_BREAKPOINT_PX}px) {
          /* ── ELASTIC, WITH A FLOOR ───────────────────────────────
             flex rather than a height, so the map takes what the rail has
             instead of deciding what the rail is. That is the whole of the
             South Pole fix: the row's height comes from the conversation, and
             the map ends where the conversation ends.

             The floor is for the first turn, where there are two messages and
             a stretched map would be a 90px letterbox of the North Sea. */
          .${MAP_CLASS} { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 260px; }
        }
        /* ── THE LABEL ON EVERY PIN ───────────────────────────────
           Flat, dark and arrowless. Leaflet's own tooltip is a white box with
           a pointer on it, which over a dark map reads as a system alert
           rather than as part of the place. The pin is already the pointer.

           pointer-events: none, because a label must never take a tap meant
           for the pin it names, and at three pins on a small map they touch. */
        .${LABEL_CLASS} {
          background: rgba(10,15,30,.86); border: 1px solid ${C.border};
          color: ${C.text}; border-radius: 8px; padding: 3px 7px;
          font-family: 'Inter', sans-serif; font-size: 10.5px; line-height: 1.25;
          box-shadow: 0 2px 8px rgba(0,0,0,.5); white-space: nowrap;
          pointer-events: none;
        }
        .${LABEL_CLASS}::before { display: none; }
        .${LABEL_CLASS} .pin-name { display: block; font-weight: 700; }
        /* The themes ARE the answer to "what is it for", so they are readable
           rather than a whisper, and gold because that is the colour this app
           uses for the thing it is telling you. */
        .${LABEL_CLASS} .pin-best { display: block; font-size: 9.5px; color: ${C.gold}; font-weight: 600; }

        .${POPUP_CLASS} .leaflet-popup-content-wrapper {
          background: transparent; box-shadow: none; padding: 0; border-radius: 12px;
        }
        .${POPUP_CLASS} .leaflet-popup-content { margin: 0; width: 132px !important; }
        /* The tip points at where the pin would be if the card opened above
           it, and it opens beside it. A triangle aimed at nothing. */
        .${POPUP_CLASS} .leaflet-popup-tip-container { display: none; }
        .${POPUP_CLASS} .leaflet-popup-close-button {
          color: ${C.muted || "#9AA3BC"}; padding: 6px 7px 0 0; font-size: 18px;
        }
        .${POPUP_CLASS} .leaflet-popup-close-button:hover { color: ${C.text || "#EFE9D6"}; }`;

// ── EVERY PIN SAYS WHAT IT IS, AND NONE OF THEM SITS ON ANOTHER ─────
//
// Oliver, 9 Sep 2026, looking at a reply that had offered him Aalborg,
// Copenhagen and Aarhus with one card open over Aarhus: "is it possible to
// include what the city is best for? When given options like that". Then:
// "On the map icons. And not just having a default one shown. But have all of
// them shown (without overlapping oneanother)".
//
// THE CARD CANNOT BE THE THING THAT IS ALWAYS SHOWN, and this is arithmetic
// rather than taste. The card is a fixed 132 wide and the rail is 240 to 380,
// so three of them side by side is 396 pixels of a map that is 380 at its
// widest. Stacked, three is 324 of a map that is 260 to 400 tall. The card is
// the right size for one place at a time and the wrong unit for all of them.
//
// A LABEL IS THE UNIT THAT FITS: the name, and the two or three words the row
// already carries about what it is for. Around 110 by 30, so six of them cost
// less than two cards.
//
// ── WHICH LEAVES WHERE TO PUT THEM ──────────────────────────────────
//
// Pure, and separated from Leaflet on purpose: this is the part with a bug in
// it if anything has, and it is answerable with numbers rather than by opening
// a browser and squinting. The component measures and applies; this decides.
//
// The scoring is the one sideFor already argued for in ChatMiniMap, extended
// from two sides to four and from pins alone to pins AND the labels already
// placed:
//
//   covering a pin    1.0   that pin cannot be hovered or tapped at all
//   covering a label  1.0   one of the answers is unreadable
//   spilling an edge  0.4   Leaflet pans to fit, so everything stays reachable
//
// Greedy in the order given rather than an exhaustive search. Six pins over
// four sides is 4096 arrangements and a perfect answer is not worth a frame of
// jank; the caller passes the newest place first, so the one a reply just added
// gets the pick of the sides.
export const LABEL_SIDES = ["top", "bottom", "right", "left"];
export const LABEL_GAP = 6;

// The box a label would occupy, given where the pin's TIP is. `ph` is the pin's
// own height, because the body stands above the tip and a label centred on the
// tip would sit across the pin it names.
export const labelBox = (pin, side, gap = LABEL_GAP) => {
  const x = Number(pin?.x) || 0, y = Number(pin?.y) || 0;
  const w = Number(pin?.w) || 0, h = Number(pin?.h) || 0;
  const ph = Number(pin?.ph) || 0;
  const mid = y - ph / 2;
  if (side === "bottom") return { l: x - w / 2, r: x + w / 2, t: y + gap, b: y + gap + h };
  if (side === "right") return { l: x + gap, r: x + gap + w, t: mid - h / 2, b: mid + h / 2 };
  if (side === "left") return { l: x - gap - w, r: x - gap, t: mid - h / 2, b: mid + h / 2 };
  return { l: x - w / 2, r: x + w / 2, t: y - ph - gap - h, b: y - ph - gap };
};

const hits = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

export const labelSides = ({ pins = [], size = null, gap = LABEL_GAP } = {}) => {
  const list = Array.isArray(pins) ? pins.filter(p => p && p.key != null) : [];
  const out = {};
  const placed = [];
  for (const pin of list) {
    let best = LABEL_SIDES[0];
    let bestScore = Infinity;
    for (const side of LABEL_SIDES) {
      const box = labelBox(pin, side, gap);
      // A pin's tip is the point that has to stay tappable, and the body
      // stands above it, so the whole pin is what a label must miss.
      let score = list.filter(o => o.key !== pin.key)
        .filter(o => hits(box, { l: o.x - 2, r: o.x + 2, t: o.y - (Number(o.ph) || 0), b: o.y }))
        .length;
      score += placed.filter(b => hits(box, b)).length;
      if (size && (box.l < 0 || box.t < 0 || box.r > size.x || box.b > size.y)) score += 0.4;
      if (score < bestScore) { bestScore = score; best = side; }
      if (score === 0) break;
    }
    out[pin.key] = best;
    placed.push(labelBox(pin, best, gap));
  }
  return out;
};
