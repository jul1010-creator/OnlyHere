// ── THE THREE DECISIONS A SWIPE MAKES ───────────────────────────────
// Oliver, 10 Aug 2026: "I would appreciate if you can make the person able to
// swipe. WITHOUT MAKING THE PAGE ALL BOUNCY TO THE SIDES!!!! It needs to be
// like when you swipe on iphone or tinder."
//
// The gesture itself has to live in App.jsx, because it owns the element and
// the listeners. These three judgements do not, and they are the entire
// difference between a swipe that feels native and one that fights the user.
// Pulled out here so each can be tested against real numbers rather than
// asserted about by reading the source and hoping.
//
// Every threshold below is a claim about how a hand moves, so each one has a
// test with a plausible gesture in it.

// How far a finger travels before the gesture is allowed to mean anything. Under
// this it is a tap, and a tap must never nudge the page.
export const SLOP_PX = 12;
// Horizontal has to beat vertical by this much to count as a page turn. Not 1.
// Every page in this app scrolls up and down, and a scroll that drifts a few
// degrees off vertical is still a scroll: at 1 it would steal the gesture and
// the page would twitch sideways while somebody was reading.
export const AXIS_BIAS = 1.4;
// Past this fraction of the screen, let go and the page turns.
export const COMMIT_FRACTION = 0.18;
// Or move this fast, in px per millisecond, and it turns however short it was.
// This is the flick, and it is what makes the gesture feel like a phone rather
// than like dragging a heavy box: a quick brush of the thumb should work.
export const FLICK_SPEED = 0.45;
// What is left of a drag pushing against the first or last page. Enough to see
// the page move, so the gesture is acknowledged, far too little to read as
// elastic. This is the bounce he is objecting to, turned down to a wall.
export const EDGE_DRAG = 0.2;

// null means undecided, keep watching. "y" means this belongs to the page's own
// scrolling and the pager must not touch it again for the rest of the gesture.
export const swipeAxis = (dx, dy) => {
  if (Math.abs(dx) < SLOP_PX && Math.abs(dy) < SLOP_PX) return null;
  return Math.abs(dx) > Math.abs(dy) * AXIS_BIAS ? "x" : "y";
};

// How far the strip actually moves. At either end of the run the finger keeps
// its full travel and the page gives back a fifth of it.
export const dragOffset = (dx, index, count) => {
  const atEdge = (index <= 0 && dx > 0) || (index >= count - 1 && dx < 0);
  return atEdge ? dx * EDGE_DRAG : dx;
};

// Distance OR speed, never both required. Requiring both is how a genuine quick
// flick ends up snapping back and feeling broken.
export const swipeCommits = (dx, dtMs, width) => {
  if (!(width > 0)) return false;
  const speed = Math.abs(dx) / Math.max(1, dtMs);
  return Math.abs(dx) > width * COMMIT_FRACTION || speed > FLICK_SPEED;
};

// Where the swipe lands. Returns the same index when there is nowhere to go, so
// a caller can compare and know to snap back instead.
export const swipeTarget = (dx, dtMs, width, index, count) => {
  if (!swipeCommits(dx, dtMs, width)) return index;
  const next = index + (dx < 0 ? 1 : -1);
  return next >= 0 && next < count ? next : index;
};
