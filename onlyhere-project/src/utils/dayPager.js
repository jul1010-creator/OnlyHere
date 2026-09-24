// ── "MAKE A 'SWIPE THROUGH' OPTION" ─────────────────────────────────
//
// Oliver, 24 Sep 2026: "Make a 'swipe through' option. Because some people
// might hate a long page of days and trips."
//
// A six day guide with map legs, stay cards, cheap gems and an add-in panel on
// every day runs to fourteen thousand characters. That is the right page for
// somebody planning at a desk and the wrong one for somebody standing outside
// Kongernes Jelling wanting to know what is next. Same guide, two ways to hold
// it.
//
// ── IT IS A TOGGLE AND NOT A BUILD OPTION ───────────────────────────
//
// He was offered it as a third card beside "Map & transport" and "Simple day by
// day", picked before the build, and chose the toggle instead. That is the
// better half: a choice made before anybody has seen the guide is a guess, and
// a toggle also reaches a guide that was saved weeks ago.
//
// NOTHING IS REMEMBERED BETWEEN VISITS, which is the option he did not pick.
// So this file holds no storage and the page holds no effect that writes any.
//
// ── AND THE WHOLE FILE IS ARITHMETIC ON PURPOSE ─────────────────────
//
// A swipe is two coordinates and a threshold, and a pager is a clamp. Both are
// the kind of thing that looks obviously right and is off by one, so both are
// here where the suite can reach them rather than inside a touch handler where
// nothing can.

// ── WHICH DAY A STEP LANDS ON ───────────────────────────────────────
//
// CLAMPED, NOT WRAPPED. Swiping past the last day of a trip and landing back on
// day 1 reads as a bug even when it was deliberate: a guide has a beginning and
// an end and a reader knows where they are in it. Wrapping also breaks the one
// thing the arrows are for, which is telling you whether there IS a next day.
export const pagerStep = (at, by, count) => {
  const n = Math.floor(Number(count));
  if (!Number.isFinite(n) || n <= 0) return 0;
  const from = Math.floor(Number(at));
  const move = Math.floor(Number(by));
  const start = Number.isFinite(from) ? from : 0;
  const step = Number.isFinite(move) ? move : 0;
  return Math.max(0, Math.min(n - 1, start + step));
};

// And the same clamp for a day picked off the strip rather than stepped to.
export const pagerAt = (at, count) => pagerStep(at, 0, count);

export const canStep = (at, by, count) => pagerStep(at, by, count) !== pagerAt(at, count);

// ── WHAT COUNTS AS A SWIPE ──────────────────────────────────────────
//
// Two things have to be true, and the second is the one that gets forgotten.
//
// FAR ENOUGH: a 12 pixel drag is a finger resting on a phone, not a gesture.
// 48 is the usual floor and is roughly a thumb's width.
//
// AND MORE ACROSS THAN DOWN: this is the whole problem with putting a
// horizontal swipe on a page that also scrolls. A reader flicking down the day
// moves a little sideways as their thumb arcs, and a handler that only checks
// horizontal distance turns every scroll into a page turn. So the horizontal
// movement has to beat the vertical one outright, and a diagonal is read as
// the scroll it almost certainly was.
export const SWIPE_MIN_PX = 48;
export const swipeDirection = ({ startX, endX, startY = 0, endY = 0, min = SWIPE_MIN_PX } = {}) => {
  const dx = Number(endX) - Number(startX);
  const dy = Number(endY) - Number(startY);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (Math.abs(dx) < min) return null;
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  // Dragging the page LEFT pulls the next day in from the right, which is the
  // direction every carousel on a phone has worked for fifteen years.
  return dx < 0 ? "next" : "prev";
};

// The label under the arrows. Says where you are in something with an end,
// because "Day 4" alone does not tell a reader whether to keep going.
export const pagerLabel = (at, count, { dayNo = null } = {}) => {
  const n = Math.floor(Number(count));
  if (!Number.isFinite(n) || n <= 0) return "";
  const i = pagerAt(at, n);
  const no = Number(dayNo);
  const which = Number.isFinite(no) && no > 0 ? no : i + 1;
  return `Day ${which} of ${n}`;
};

// The two ways to hold the guide, named as what they give rather than as what
// they are: "Paged" describes the mechanism and "One day at a time" describes
// what the reader gets.
export const PAGER_MODES = [
  { key: "all", label: "Whole trip" },
  { key: "one", label: "One day at a time" },
];
