// ── A HEART IS NOT AN INSTRUCTION ────────────────────────────────────
//
// 25 August 2026. The audit said the entry pages had no way to add a place to a
// trip. That was wrong, and the way it was wrong is worse than the gap would
// have been: DetailPage HAS a save button. App.jsx passes it `isSaved` and
// `onToggleSave` on all six kinds, and the component renders them.
//
// It renders them as a 32-pixel outlined heart, in a corner, on top of a
// photograph, with no label.
//
// So the feature is built, wired, live, and invisible. Somebody reading about
// Ribe Domkirke sees a heart and has no way to learn that pressing it puts the
// cathedral into the trip Gemlyx will plan for them, because nothing on the page
// says so and nothing after the press says so either. The whole loop — save
// places, then ask for a route through them — exists in the intake screen and in
// the "Ask Gemlyx for a road trip from these" panel, and the only entrance to it
// is an unlabelled glyph.
//
// That is the same failure this codebase keeps finding in itself: finished,
// correct, tested code that nothing tells anybody about. The repair is not a
// feature. It is words.
//
// ── WHAT THE WORDS HAVE TO DO ───────────────────────────────────────
//
// SAY THE ACTION, NOT THE STATE. "Saved" tells you what happened. "Add to my
// trip" tells you what it is for. A button that has to be understood before it
// can be pressed should be labelled with the reason to press it.
//
// AND SAY WHAT COMES NEXT. Layla's checklist reads as robotic because it lists
// boxes without ever saying what filling one buys you. A place saved with no
// visible consequence is the same mistake in one line: the traveller did a thing
// and the product said nothing back about why. So the second line names the
// trip, and offers the door into it, and the offer only exists when there is
// something behind the door.
//
// NEVER COUNT WHAT IS NOT THERE. `savedLine(0)` returns null rather than "0
// places saved", because a product narrating an empty list at somebody is the
// tone Oliver objected to twice tonight.

const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.trunc(Number(v)) : 0);

// The button. Reads as the action when it would add, and as the state — plus the
// way out — when it would remove, because a control that changes meaning has to
// say which meaning it currently has.
export const saveLabel = (isSaved) => (isSaved ? "♥ In your trip" : "＋ Add to my trip");

// The sentence under it. Names the consequence of the press that just happened,
// or of the press being offered.
export const saveHint = (isSaved, count) => {
  const c = n(count);
  if (!isSaved) return "Gemlyx can build a route around the places you add.";
  if (c > 1) return `Added. Gemlyx can plan a trip around this and your ${c - 1} other saved place${c - 1 === 1 ? "" : "s"}.`;
  return "Added. Gemlyx can plan a trip around this.";
};

// The line the saved-places panel uses. Null at zero, on purpose.
export const savedLine = (count) => {
  const c = n(count);
  if (!c) return null;
  return c === 1 ? "1 place saved" : `${c} places saved`;
};

// The door. Only offered when there is something behind it, and it says where it
// goes rather than what it is called.
export const planFromSavedLabel = (count) => {
  const c = n(count);
  if (!c) return null;
  return c === 1 ? "Plan a trip around it →" : `Plan a trip around all ${c} →`;
};
