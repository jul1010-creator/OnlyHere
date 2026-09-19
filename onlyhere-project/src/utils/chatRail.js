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
        /* ── AND THE PHONE GETS THE MAP TOO, UNDER THE CONVERSATION ──
           Oliver, 13 Sep 2026: "the phone still doesn't have the map
           implemented."

           It was hidden below the breakpoint from the day the rail was built,
           for a reason written here at the time: there is no side column on a
           phone, and a map stacked into the panel pushes the reply off the top.
           The second half of that is right and the conclusion was too strong.
           Under the conversation rather than over it, the reply keeps the top of
           the screen and the map is where a thumb already is.

           IT ONLY APPEARS WHEN IT HAS SOMETHING TO SAY. The has-map class is set by
           App.jsx at two pins, which is the number this file has argued for
           since the rail was written: "a map with one pin says almost nothing,
           because the thing a map is for is showing places in relation to each
           other." On a phone that argument is worth more, because the space it
           takes is a larger share of what there is.

           A HEIGHT, not flex. Above the breakpoint the map is elastic and takes
           what the rail has; in a column there is nothing to take, so it says
           how tall it is. 190 is about a fifth of a phone screen, enough for two
           pins and their labels and small enough that the reply above it is
           still the page. */
        @media (max-width: ${RAIL_BREAKPOINT_PX - 1}px) {
          .chat-with-rail { flex-direction: column; }
          .${RAIL_CLASS}.has-map {
            display: flex; flex-direction: column; min-height: 0;
            height: 190px; margin-bottom: 12px;
          }
        }
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
// ── CONFIRMED, OR ONLY ON THE TABLE ─────────────────────────────────
//
// Oliver, 19 Sep 2026, looking at a map carrying Gilleleje. He had never said
// the word: Gemlyx named it once, inside a question about the children's ages,
// as the gentle alternative to Legoland. It arrived with the same red pin as
// Copenhagen, which he had flown into.
//
// His rule: "the pointer on maps should only be if it's confirmed. The places
// that are being considered should be green dots instead. We need to prevent
// the map from looking like a mess."
//
// So a pin is a claim and a dot is an offer, and the line between them is the
// one he drew when asked: a place is confirmed when THEY named it, or when they
// said yes to it. Everything Gemlyx has put forward and they have not picked up
// is still being considered, and a map that says so is telling the truth about
// a conversation rather than flattening it.
//
// READ FROM THE WALK RATHER THAN FROM A SECOND PASS over the transcript, because
// the walk already knows which turn named what, and it already knows the one
// thing a fresh reader would get wrong: a refusal lifted by a later turn of
// theirs is them naming it, and that is a confirmation.
export const mapPlaces = ({ messages = [], placesFor, rejectsFor, correctsFor, coordsFor, cap = MAP_PIN_CAP, picked = [] } = {}) => {
  const none = { pins: [], dropped: 0 };
  if (typeof placesFor !== "function" || typeof coordsFor !== "function") return none;
  const list = Array.isArray(messages) ? messages : [];
  const order = [];
  const byKey = new Map();
  let newest = new Set();
  // What the last reply introduced, so a correction has something to point at.
  // See correctedTo in chatPlaces.js: "No, it's actually Billund I'm flying
  // into" names the right place and says nothing about the wrong one, because
  // the wrong one is in the turn it is correcting.
  let lastAssistantAdded = [];
  // ── AND A REFUSAL OUTLIVES THE TURN IT WAS SAID IN ────────────────
  //
  // Found 14 Sep 2026 by testing the live chat rather than by reading this
  // file. A fresh conversation, my first message: "Flying into Billund for 6
  // days in October, two adults, we love history and the coast, no Copenhagen
  // please". Two turns later the map carried six pins and one of them was
  // COPENHAGEN. Measured here straight after, with the real readers:
  //
  //   ["Skip Copenhagen please"]                              -> []
  //   + "Copenhagen has the better museums though."           -> [copenhagen]
  //
  // The refusal worked. It worked for exactly one turn. Every rejection was
  // applied to the map as the loop passed the turn that carried it, and nothing
  // remembered it afterwards, so the next time ANYBODY named the place it came
  // straight back. Gemlyx names a refused place all the time, usually in the
  // sentence explaining why it is leaving it out, which is the sentence most
  // likely to put the pin back on the screen.
  //
  // ONLY THE TRAVELLER CAN LIFT IT. A refusal stays until a LATER TURN OF
  // THEIRS names the place without refusing it again, which is them changing
  // their mind. Gemlyx mentioning it is not the traveller changing their mind,
  // and reading it as one is the same mistake as reading the brief out of
  // Gemlyx's own replies.
  const refused = new Set();
  // Their own words, plus the places they tapped Yes on. A Yes is a decision
  // nobody typed, so the walk cannot read it out of the text, which is the same
  // reason withoutExcluded exists for the No.
  const confirmed = new Set((Array.isArray(picked) ? picked : [])
    .map(p => String(p?.name || p || "").trim().toLowerCase()).filter(Boolean));
  // Who said each name first, which is what decides pin or dot. See the note at
  // the addition below.
  const first = new Map();
  for (const m of list) {
    if (!m || m.isError) continue;
    const text = String(m.text || "");
    if (!text.trim()) continue;
    const here = new Set();
    // BEFORE the additions, so the correction lands on the pin that is already
    // there rather than on the one this turn is about to add.
    if (m.role === "user" && typeof correctsFor === "function") {
      const to = correctsFor(text, m);
      if (to) {
        const replaced = lastAssistantAdded.filter(k => k !== to);
        // One in, one out. A reply that named four towns cannot be corrected by
        // naming one, and guessing which of the four is how a pin somebody
        // wanted disappears.
        if (replaced.length === 1) {
          const at = order.indexOf(replaced[0]);
          if (at >= 0) order.splice(at, 1);
          byKey.delete(replaced[0]);
          here.delete(replaced[0]);
        }
      }
    }
    const added = [];
    const named = [];
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
      // What this turn NAMED, refused or not, which is what the lift below
      // reads. Collected before the refusal check, because the whole question
      // there is whether the traveller has just named something they had ruled
      // out, and a list the check has already filtered cannot answer it.
      named.push({ key, place: p, lat: at.lat, lon: at.lon });
      // Refused earlier and not asked for since. See `refused` above.
      if (refused.has(key)) continue;
      here.add(key);
      added.push(key);
      // ── WHO BROUGHT IT UP, AND ONLY THAT ─────────────────────
      //
      // Oliver, 19 Sep 2026, after the first version of this shipped: "in order
      // to go from a green dot to a confirmed point, you need it confirmed. And
      // just talking about it, won't confirm it."
      //
      // The first version read any turn of theirs naming a place as confirming
      // it, and he is right that this is too loose. Gemlyx offers Marselisborg
      // Dyrehave, they write "how far is the dyrehave from the city", and the
      // dot turned into a pin on a place nobody had agreed to. Asking about
      // something is the most ordinary thing to do with an offer, and it is not
      // the same as taking it.
      //
      // So the INTRODUCER decides, once, and nothing they say afterwards moves
      // it. A place they brought up themselves was never an offer and is theirs
      // from the first word. A place Gemlyx put forward stays an offer until
      // they press Yes on it, which is the one unambiguous confirmation there
      // is and the thing `picked` carries.
      //
      // `first` rather than `confirmed.add`, so a later turn cannot change the
      // answer in either direction. A town capped off the map and named again
      // keeps whoever said it first.
      if (!first.has(key)) first.set(key, m.role === "user" ? "them" : "gemlyx");
      if (!byKey.has(key)) order.push(key);
      byKey.set(key, { key, place: p, lat: at.lat, lon: at.lon });
    }
    // Only a REPLY can be corrected, and only the newest one: a question two
    // replies old was answered or dropped, which is the rule askedBeforeTurns
    // already follows for the brief.
    if (m.role === "assistant") lastAssistantAdded = added;
    // AFTER the additions, so a turn that both names and turns down the same
    // place lands on the refusal. placesNamedIn already skips it, and agreeing
    // twice is cheaper than depending on that from over here.
    const refusedHere = new Set();
    if (typeof rejectsFor === "function") {
      for (const key of (rejectsFor(text, m) || [])) {
        const k = String(key || "").trim().toLowerCase();
        if (!k) continue;
        refusedHere.add(k);
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
        refused.add(k);
      }
    }
    // A LATER TURN OF THEIRS NAMING IT IS THEM CHANGING THEIR MIND. Read from
    // what this turn named, which is `added` above, so it costs nothing extra
    // and cannot disagree with the reader that filled it. Their turn only: a
    // reply naming a refused place is Gemlyx talking, and it is what put the
    // pin back for a fortnight.
    if (m.role === "user" && refused.size) {
      for (const n of named) {
        if (!refused.has(n.key)) continue;
        // ── AND THE TURN THAT REFUSES IT ALSO NAMES IT ──────────
        // "not Aarhus" names Aarhus. Without this the refusal would be lifted
        // by the very sentence that made it, on the same pass, which is the
        // case the comment above the rejection block is already about: a turn
        // that both names and turns down a place lands on the refusal.
        if (refusedHere.has(n.key)) continue;
        refused.delete(n.key);
        // Changing their mind puts it back exactly as it was, which after
        // 19 Sep means as whatever it was before they refused it. Lifting a
        // refusal is talking about a place, and talking about a place does not
        // confirm it: an offer they turned down and then asked about again is
        // an offer again, not a decision.
        // Back on the map, where the rest of this loop would have put it had it
        // never been refused: at the end of the order, as the newest thing.
        if (byKey.has(n.key)) continue;
        order.push(n.key);
        byKey.set(n.key, { key: n.key, place: n.place, lat: n.lat, lon: n.lon });
        here.add(n.key);
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
    pins: kept.map(pin => ({
      ...pin,
      latest: newest.has(pin.key),
      // Theirs from the first word, or an offer they have pressed Yes on.
      confirmed: first.get(pin.key) === "them" || confirmed.has(pin.key),
    })),
    // Said rather than swallowed, so the caption can admit the map is not the
    // whole conversation instead of quietly being a different trip.
    dropped: all.length - kept.length,
  };
};

// ── AND THE THINGS TOO SMALL TO DRAW ON A MAP OF A COUNTRY ──────────
//
// Oliver, 12 Sep 2026: "Attractions? It's naming alot of attractions, but not
// showing them on the map.. that has to be done."
//
// The map showed towns and nothing else, and the reason was his too, from
// 8 September: "we only need to have the towns popping up on the map. No need
// to have it popping up two places." Both are right, and they are right about
// different maps. That rule was written when this was a map of DENMARK, where a
// bar or a bakery is a dot inside a town it is already showing. Since then the
// map flies down to whatever the conversation is about, and on a ten-kilometre
// view of Copenhagen the town pin is the thing saying nothing while the five
// places the reply just named are missing.
//
// This is the third rule of Oliver's this week whose premise moved under it —
// the lone-pin-equals-the-country rule and the card that opened itself were the
// other two, both written for a country map and both wrong once it zoomed.
//
// SO THE PIN EXISTS AT EVERY ZOOM AND IS ONLY DRAWN CLOSE UP, which is what he
// chose when asked: "Only when zoomed in." Not a different set of pins per
// zoom, because the camera beats fly to a pin by name and a place that stops
// existing when the map pulls back would be a beat with nowhere to go.
//
// 11, between CLUSTER_ZOOM (10, two or more towns framed together) and
// FOCUS_ZOOM (12, where a zoom-in beat lands). So a map comparing two towns
// stays a map of two towns, and a map that has settled on one place shows what
// is in it.
export const SPOT_PIN_ZOOM = 11;
export const isSpotPin = (pin) => String(pin?.place?._src || "") !== "town";
export const spotsShowAt = (zoom) => Number.isFinite(Number(zoom)) && Number(zoom) >= SPOT_PIN_ZOOM;

export const MAP_CLASS = "chat-rail-map";

// ── WHEN THE PHONE HAS A MAP AT ALL, WRITTEN ONCE ───────────────────
//
// Oliver, 13 Sep 2026: "the phone still doesn't have the map implemented."
// The stacked rule above was the first answer, and measured at 390 by 844 it
// shipped a blank strip: the rail got its class and its 190 pixels and the
// component inside it returned null below the breakpoint, so the phone had a
// gap where the map was promised. Two readers of "is there a map on a phone",
// one in the CSS class and one in the component, and they disagreed.
//
// So the question is asked here and both read it. App.jsx puts has-map on
// the rail when this says so, and ChatMiniMap renders when this says so or
// the column is wide, and neither holds a copy of the number. Two, for the
// reason the CSS gives: a map with one pin says almost nothing, and on a
// phone the fifth of a screen it takes is a larger share of what there is.
export const PHONE_MAP_PINS = 2;
export const phoneMapShows = (pins) => (Array.isArray(pins) ? pins : []).length >= PHONE_MAP_PINS;

// ── AND ON A PHONE IT IS ASKED FOR, 19 SEP 2026 ─────────────────────
//
// Oliver: "on phone, we gotta have a 'show map' button."
//
// The map arrived on phones on 13 Sep and took its 190 pixels the moment there
// were two pins, whatever the person was doing. On a 844 pixel screen that is a
// fifth of everything, spent without being asked, on the turn somebody is
// reading. A button is the same map one tap away and nothing until then.
//
// TWO QUESTIONS, NOT ONE, and they are different: phoneMapShows is whether
// there is a map worth offering, which is what decides whether the button
// appears at all, and this is whether it is open. The class on the rail, the
// component that builds the map and the button's own label all read this one,
// so a map that is open and a rail that is not is not a state that exists.
export const phoneMapOpen = (pins, open) => phoneMapShows(pins) && !!open;
export const MAP_TOGGLE_CLASS = "chat-map-toggle";
// ── AND WHERE THE CHOICE GOES WHEN THERE IS NO MAP ON SCREEN ────────
//
// Oliver, 19 Sep 2026: "Obviously on phone, it would have to pop up in chat
// instead.. with the add or not."
//
// Add to trip and Not interested ride on the card on the pin, and on a phone
// that card is behind a map that is closed until somebody opens it. So the
// same two buttons ride on the card under the reply as well, and this class is
// what stops them appearing twice on a desktop, where the map is the side
// column and is always there.
export const PHONE_CHOICE_CLASS = "chat-phone-choice";

// The whole of the side column, which is what he picked on 8 Sep: "The
// sidepanel is primarily for the map." Only at the rail breakpoint: below it
// there is no column to put a map in, and a map stacked into a phone panel
// pushes the reply off the top.
export const POPUP_CLASS = "gemlyx-chat-popup";
// Every pin carries one of these, always. labelSides at the foot of this file
// decides where each one goes and says why it is a label rather than the card.
export const LABEL_CLASS = "gemlyx-pin-label";
// ── THE MARKS A CONSIDERED PLACE GETS ───────────────────────────────
//
// Named here rather than in the component for the reason every other class on
// this map is: the CSS that draws them is here, the component that asks for
// them is there, and a string spelled out in both is how a rename half lands.
// DOT_GREEN is the same value ChatMiniMap draws the dot itself with, and the
// suite holds the two to each other.
export const DOT_CLASS = "gemlyx-chat-dot";
export const DOT_PULSE = "gemlyx-dot-pulse";
export const CORNER_CLASS = "gemlyx-map-corner";
export const DOT_GREEN = "#3FBF6A";

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
        /* On a phone the rail is a row of its own with a stated height, so the
           map fills it the same way it fills the rail on a desktop. */
        @media (max-width: ${RAIL_BREAKPOINT_PX - 1}px) {
          .${RAIL_CLASS}.has-map .${MAP_CLASS} {
            display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0;
          }
          /* ── AND NO PLUS AND MINUS ON A STRIP THIS SHORT ──────────
             Measured at 390 by 844: the map inside the rail is 167px tall,
             the zoom control is 60px of that in the bottom right corner, and
             the "Is this interesting?" card, opened on a pin near it, sat
             under the control with the No button covered. A phone pinches to
             zoom, so the control is chrome it does not need, and the card
             is the thing it does. */
          .${RAIL_CLASS} .leaflet-control-zoom { display: none; }
        }
        /* ── AND THE BUTTON THAT OPENS IT, ON PHONES ONLY ─────────
           Above the breakpoint the map is the side column and is always there,
           so a control offering to show it would be offering something already
           on screen. Hidden by default and shown in the phone query, rather
           than the reverse, so a viewport this file does not know about gets
           the desktop behaviour it already had. */
        .${MAP_TOGGLE_CLASS} { display: none; }
        .${PHONE_CHOICE_CLASS} { display: none; }
        @media (max-width: ${RAIL_BREAKPOINT_PX - 1}px) {
          .${MAP_TOGGLE_CLASS} { display: inline-flex; }
          /* The pin's own card carries these above the breakpoint. Below it the
             map may not be open at all, so the card under the reply carries
             them instead. */
          .${PHONE_CHOICE_CLASS} { display: block; }
        }
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
        /* ── THE DOT THAT IS STILL BEING CONSIDERED ───────────────
           Oliver, 19 Sep 2026: "what about the dot becomes a little blinking
           greendot". Blinking rather than steady because the two marks answer
           two different questions: a pin is a place in the trip and it sits
           there, a dot is a place waiting for an answer.

           A PULSE, NOT A BLINK. Something that switches off and on at this size
           reads as a fault, and on a map with three of them it is a strobe. The
           opacity floor is 0.45, so the dot is on the map the whole time and
           what moves is how much it is asking.

           AND IT STOPS FOR ANYBODY WHO ASKED IT TO. Two seconds of movement
           that never ends, in the corner of a page somebody is reading, is the
           exact thing prefers-reduced-motion exists for. The dot stays, at full
           strength, which is the half carrying the meaning. */
        @keyframes ${DOT_PULSE} {
          0%, 100% { opacity: 1; }
          50% { opacity: .45; }
        }
        .${DOT_CLASS} { animation: ${DOT_PULSE} 1.9s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .${DOT_CLASS} { animation: none; opacity: 1; }
        }
        /* ── AND THE NAME OF THE ONE BEING OFFERED ────────────────
           "the suggested place shows in the left corner of the map."

           The dots carry no label of their own, so this is where a suggestion
           gets named. Top left, out of the way of the zoom control at the
           bottom right and of the labels that sit above the pins. Nothing at
           all when nothing is being considered, because a box reading "nothing
           yet" is furniture. */
        .${CORNER_CLASS} {
          position: absolute; top: 8px; left: 8px; z-index: 500;
          display: flex; flex-direction: column; gap: 3px;
          /* Wider than the name alone needed, because it carries a sentence
             now: Oliver, 19 Sep, "you have a short writing of it on the maps".
             Still clear of the zoom control in the other corner. */
          max-width: calc(100% - 80px);
          background: rgba(10,15,30,.86); border: 1px solid ${C.border};
          color: ${C.text}; border-radius: 8px; padding: 4px 8px;
          font-family: 'Inter', sans-serif; font-size: 10.5px; line-height: 1.3;
          box-shadow: 0 2px 8px rgba(0,0,0,.5);
          pointer-events: none;
        }
        .${CORNER_CLASS} .corner-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
          background: ${DOT_GREEN};
          animation: ${DOT_PULSE} 1.9s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .${CORNER_CLASS} .corner-dot { animation: none; }
        }
        .${CORNER_CLASS} .corner-head { display: flex; align-items: center; gap: 6px; }
        .${CORNER_CLASS} .corner-name { font-weight: 700; }
        .${CORNER_CLASS} .corner-more { color: ${C.muted}; }
        /* Two lines at most. The sentence is there to say what the place is,
           and a paragraph over a 380px map is the mess the dots were drawn to
           prevent. */
        .${CORNER_CLASS} .corner-line {
          color: ${C.light}; font-size: 10px; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
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
