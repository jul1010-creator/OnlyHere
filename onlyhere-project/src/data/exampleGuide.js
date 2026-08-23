// ── THE GUIDE PEOPLE CAN SEE BEFORE THEY BUILD ONE ───────────────────
//
// Oliver, 23 Aug 2026: "can we make an example of the guide somewhere? So
// people can see what Gemlyx will create them?"
//
// The whole product funnels into one button, and until somebody presses it they
// are being asked to have a conversation on faith. An example removes that.
//
// ── AND IT IS EMPTY, WHICH IS THE POINT ─────────────────────────────
//
// Nothing here was written by hand and nothing here ever should be. Every other
// sentence in this product is checked against the place's own sources before it
// is printed, and terms.html clause 10.3 says in its own words that what is
// protected is "the selection, verification and arrangement" of facts. An
// invented example guide would be the one page on the site making that untrue,
// on the page whose entire job is showing a stranger what Gemlyx is like.
//
// So this file holds a REAL guide or it holds nothing, and while it holds
// nothing the route and the link do not exist. A visitor never meets a broken
// page and never meets a fabricated one.
//
// ── HOW TO FILL IT ──────────────────────────────────────────────────
//
//   1. Build a guide on the live site the way a traveller would, and read it.
//      Every fact in it is going on a public page with no traveller behind it,
//      so it is worth the same fact-check a published entry gets.
//   2. Open the browser console on the guide page and run:
//         copy(JSON.stringify(window.__gemlyxGuide, null, 2))
//      or take the object from the save row in Supabase.
//   3. Paste it as the value of EXAMPLE_GUIDE below, replacing `null`.
//   4. Run `node tests/run.mjs`. The shape is checked there, so a paste that
//      lost half a day fails on your machine instead of on the site.
//
// Set EXAMPLE_GUIDE_NOTE to the one line a reader should see above it, saying
// which trip it was and that it is a real one.

export const EXAMPLE_GUIDE = null;

// Shown above the example so nobody mistakes it for their own trip. Written
// here rather than in the component because it is content, and content that
// describes a specific guide belongs beside that guide.
export const EXAMPLE_GUIDE_NOTE =
  "This is a real guide Gemlyx built, kept here so you can see one before you make your own.";

export const EXAMPLE_GUIDE_PATH = "/example";

// ── WHAT COUNTS AS A GUIDE ──────────────────────────────────────────
//
// The renderer reads `days`, and every day reads `stops`. A paste that lost the
// days array renders a title over nothing, which looks like the product being
// broken rather than the paste being broken. So the shape is checked, and the
// check is the same one the build pipeline applies: days with stops in them.
//
// Returns a list of problems, empty when there are none, which is the shape
// bodyProblems and placeIssues already use in this codebase.
export const exampleGuideProblems = (guide) => {
  if (guide == null) return [];                 // absent is legal, broken is not
  const out = [];
  if (typeof guide !== "object" || Array.isArray(guide)) return ["the example is not a guide object"];
  if (!String(guide.title || "").trim()) out.push("no title");
  const days = Array.isArray(guide.days) ? guide.days : null;
  if (!days) out.push("no days array");
  else if (!days.length) out.push("the days array is empty");
  else {
    days.forEach((d, i) => {
      const stops = Array.isArray(d?.stops) ? d.stops : null;
      if (!stops) out.push(`day ${i + 1} has no stops array`);
      else if (!stops.length) out.push(`day ${i + 1} has no stops`);
      else if (stops.some(s => !String(s?.name || "").trim())) out.push(`day ${i + 1} has a stop with no name`);
    });
  }
  return out;
};

// One question, asked in one place, so the route and the link cannot disagree
// about whether there is an example to show.
export const hasExampleGuide = () =>
  !!EXAMPLE_GUIDE && exampleGuideProblems(EXAMPLE_GUIDE).length === 0;
