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
          .${RAIL_CLASS} { display: block; flex: 0 0 138px; }
          .${INLINE_CARDS_CLASS} { display: none !important; }
        }`;
