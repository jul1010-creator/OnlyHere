// ── "CAN YOU HAVE IT SHOWING ON THE SIDE OF THE CHAT PANEL" ─────────
//
// Oliver, 26 Aug 2026: "With such a small chat panel, it is more convenient
// that people can read while seeing the picture."
//
// The panel is 300 pixels tall. A row of 124-pixel cards under a reply pushes
// the reply itself off the top of that box, so the picture arrives by taking
// away the sentence it illustrates. Beside it, the two are readable at once.
//
// ── WHICH REPLY'S PLACES, AND WHY NOT ALL OF THEM ───────────────────
//
// A rail that accumulates every place named all conversation is the thing
// chatPlaces.js exists to prevent, in a new shape: "a gallery with a sentence
// attached, and the sentence is the product." So the rail carries ONE reply's
// worth — the most recent one that actually introduced somewhere.
//
// The words "most recent that introduced somewhere" are doing the work. Taking
// the latest reply full stop would blank the rail the moment Gemlyx asks a
// follow-up question, which is most turns, and a picture that flickers away
// while somebody is typing an answer to the question underneath it is worse
// than no picture. So an empty reply leaves the last real one standing.
//
// ── ERRORS ARE NOT REPLIES ──────────────────────────────────────────
//
// "Hit a snag on my end" has no places in it, but it IS the newest assistant
// turn, and a naive newest-first walk would treat it as a reply that introduced
// nothing and keep looking — which is right. It is skipped explicitly anyway,
// because the day it carries a town name in an error string is the day the rail
// illustrates a failure.

// The message shapes this reads, stated because the rail is fed from App.jsx's
// aiMessages and nothing here should have to know more than these three fields.
const isAssistantReply = (m) => !!m && m.role === "assistant" && !m.isError;

// ── placesFor IS INJECTED ───────────────────────────────────────────
//
// The selection rule and the matching rule are different questions, and
// chatPlaces.placesNamedIn already owns the second one — with the published
// pools, the boundary-safe matcher, the cap, and the "only what Gemlyx
// introduced" rule Oliver asked for on 26 August. Calling it from here would
// drag previewMatch and six data files into a file that answers "which reply".
//
// It also makes this testable without a single published row: the suite hands
// in a function, and what is checked is the WALK, which is the part that has a
// bug in it if anything does.
export const railPlaces = ({ messages = [], placesFor } = {}) => {
  if (typeof placesFor !== "function") return [];
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i];
    if (!isAssistantReply(m)) continue;
    const found = placesFor(m.text || "", m) || [];
    if (found.length) return found;
  }
  return [];
};

// ── AND THE SAME CARD MUST NEVER APPEAR TWICE ───────────────────────
//
// The rail and the inline cards are BOTH rendered, and CSS shows exactly one of
// them: the rail needs horizontal room that a phone does not have, and which
// one fits is a question about the viewport, which JavaScript here cannot
// answer and a media query answers for free on every resize.
//
// Rendering both and hiding one is the part that could go wrong quietly, so it
// is named rather than left to two class attributes in a 1.5 MB file agreeing
// with each other by luck. These are the two classes, the breakpoint they share,
// and the rule: at every width, exactly one of them is displayed.
export const RAIL_CLASS = "chat-rail";
export const INLINE_CARDS_CLASS = "chat-cards-inline";
export const RAIL_BREAKPOINT_PX = 900;

// The CSS, generated here rather than typed into the style block, so the
// breakpoint above cannot drift from the rule below. Read by App.jsx's <style>.
export const railCss = () => `
        .chat-with-rail { display: flex; gap: 12px; align-items: flex-start; }
        .${RAIL_CLASS} { display: none; }
        @media (min-width: ${RAIL_BREAKPOINT_PX}px) {
          /* ── 138px WAS A CARD'S WIDTH, AND THE MAP NEEDS MORE ────
             Oliver, 6 Sep 2026, asked for map pins with a small picture popup
             and then, shown the measurement, chose it himself: "make the chat
             smaller and broaden the map."

             THE MEASUREMENT. At 138px the popup card came out 132 by 108 on a
             138 by 192 map: 54 per cent of it, and one open card sat over BOTH
             remaining pins, so no pin could be reached by hover or by tap
             while another was open. A map you cannot move between is not a map,
             it is a picture of one.

             A proportion rather than a number, because the binding constraint
             is the CARD's 132px and what is left over for the map either side
             of it. Clamped at both ends: never under 210, where the card is
             the whole width again, and never over 300, where the chat starts
             paying for room the map has stopped using. */
          .${RAIL_CLASS} { display: block; flex: 0 0 clamp(210px, 26%, 300px); }
          .${INLINE_CARDS_CLASS} { display: none !important; }
        }`;

// ── "IT COULD BE COOL IF A MAP WAS USED TO EXPLAIN" ─────────────────
//
// Oliver, 6 Sep 2026, next to a screenshot of Layla: "right now there is not
// much else than just chatting."
//
// THE PINS ARE NOT THE RAIL'S PINS, and the difference is the whole design.
// railPlaces carries ONE reply's worth on purpose, because a photo rail that
// accumulates becomes "a gallery with a sentence attached, and the sentence is
// the product." That reasoning is about DECORATION and it does not transfer: a
// map with one pin says almost nothing, because the thing a map is for is
// showing places in relation to each other. Two pins is where it starts being
// worth the space.
//
// So this walk is the opposite of the one above: every message, oldest first,
// keeping what it finds. He chose it over three narrower options, and what he
// chose it for was "the trip taking shape".
//
// BOTH SIDES OF THE CONVERSATION, unlike the rail. The rail skips a place the
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

// placesFor, rejectsFor and coordsFor are all injected, for the reason
// railPlaces gives: the matching rules live in chatPlaces/previewMatch and the
// coordinate resolver lives in guideEnrichment, and what has a bug in it if
// anything does is THE WALK. Handed three functions, this file is testable with
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

// Under the photo, in the same 138px column, which is what he picked. Only at
// the rail breakpoint: below it there is no column to put a map in, and a map
// stacked into a 300px phone panel pushes the reply off the top, which is the
// exact problem the rail was built to solve.
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
          .${MAP_CLASS} { display: block; margin-top: 10px; }
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
