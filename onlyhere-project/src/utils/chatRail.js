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
