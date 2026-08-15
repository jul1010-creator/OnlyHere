// ── A SCREENSHOT SHOWS THE OUTPUT, NOT THE REASON ────────────────────
//
// Oliver, 15 Aug 2026, unprompted: "If you want, you can make 'preview' able to
// have a link as a report for you. If reports make things better for you.."
//
// They do, and this is why. Every defect on this screen for the last week has
// been found the same way: he sends a screenshot, and then somebody reads the
// matcher and reconstructs which of two passes put a row there, whether the
// category gate opened, what the row was tagged, and where its card line was
// cut. That reconstruction is a guess with a good hit rate, and the misses are
// expensive, because a wrong diagnosis ships a fix for a bug that was not
// there and leaves the one that was.
//
// This is the same thing the codebase's first standing rule says about
// everything else: a request has a failure rate while code does not. Asking a
// reader to work out why a card is on a screen is a request. Writing down what
// the screen knew, at the moment it rendered, is code.
//
// ── WHY A FILE AND NOT A URL ────────────────────────────────────────
// A link needs an endpoint, an endpoint needs a deploy, and the standing
// instruction is that nothing gets pushed. A file needs neither and works on
// the build already in front of him. It is JSON, so it can be diffed between
// two runs, which a link would not have been either.
//
// ── WHAT IS DELIBERATELY NOT IN IT ──────────────────────────────────
// The traveller's typed name and their free text self description. The
// profile's BANDS change what gets recommended and belong in a report about
// why something was recommended; the sentence somebody wrote about themselves
// does not, and a debug file is exactly the sort of place personal text ends
// up living forever. The button that produces this only renders on the
// pipeline test path, where the traveller is fabricated, and this rule is here
// for the day somebody widens that.
import { cardLine, cardLineSource } from "./cardLine";
import { themesOf, tierOf } from "./placeThemes";
import { parentTownOf, groupKeyOf } from "./previewMatch";

export const REPORT_KIND = "gemlyx-preview-report";
export const REPORT_VERSION = 1;

// Which of the three passes in matchedPlaces put this row on the screen. The
// row already carries the evidence, and reading it here rather than re-running
// the matcher means the report describes the render that happened.
export const passOf = (place, wasNamed) => {
  if (place?._viaRegion) return "region";
  if (wasNamed) return "named";
  return "inNamedTown";
};

export const rowReport = (place, { wasNamed = false } = {}) => ({
  name: place?.name ?? "",
  id: place?.id ?? null,
  src: place?._src ?? null,
  section: groupKeyOf(place),
  pass: passOf(place, wasNamed),
  themes: themesOf(place),
  tier: tierOf(place)?.id ?? null,
  parentTown: parentTownOf(place),
  viaRegion: place?._viaRegion ?? null,
  leaving: !!place?._leaving,
  holds: place?._holds ?? null,
  // The two halves of the narrowing, kept apart. `held` says WHICH gate closed:
  // "category" is the brief never asking for attractions at all, "fit" is the
  // brief asking and this row not being one of the ones they meant. Collapsing
  // them into one boolean is how the second one went unnoticed for a day.
  offered: !!place?._notAsked,
  heldBy: place?._held ?? null,
  fit: place?._fit ?? null,
  cardLine: cardLine(place),
  cardLineFrom: cardLineSource(place),
  // FULL, not the clip. The card line rule can only be judged against the
  // sentence it was choosing from, and the clip is the thing under suspicion.
  desc: String(place?.desc ?? ""),
});

// Bands only. See the note at the top of this file.
const profileReport = (p) => (!p ? null : {
  ageBand: p.ageBand || "",
  company: p.company || "",
  pace: p.pace || "",
  hasDescription: !!String(p.description || "").trim(),
});

export const buildPreviewReport = ({
  at = "",
  convoText = "",
  saidByTraveller = "",
  testProfile = null,
  intake = {},
  wanted = null,
  themes = null,
  window: win = null,
  sections = [],
  eventPlan = null,
  picked = [],
  pickedExtras = [],
  matched = [],
  namedNames = [],
  profile = null,
  coverage = null,
} = {}) => {
  const named = new Set(namedNames);
  return {
    kind: REPORT_KIND,
    version: REPORT_VERSION,
    at,
    brief: {
      // The whole conversation, because a matcher that reads it is being judged.
      convoText,
      // And the traveller's own turns alone, because wantedCategories reads
      // only these on purpose and the difference between the two strings is a
      // real source of disagreement worth being able to see.
      saidByTraveller,
      testProfile,
      intake: {
        arrival: intake.arrival || "",
        departure: intake.departure || "",
        interest: Array.isArray(intake.interest) ? intake.interest : [],
      },
    },
    read: {
      wantedCategories: wanted ? [...wanted].sort() : null,
      briefThemes: themes ? [...themes].sort() : null,
      window: win,
      profile: profileReport(profile),
    },
    sections: (Array.isArray(sections) ? sections : []).map(cat => ({
      label: cat.label,
      src: cat.src,
      shown: (cat.items || []).map(p => p.name),
      offeredAll: (cat.offered || []).map(p => p.name),
      offeredShown: (cat.picks || []).map(e => ({ name: e.place?.name, reason: e.reason, score: e.score })),
    })),
    events: !eventPlan ? null : {
      limit: eventPlan.limit,
      dated: eventPlan.dated,
      picked,
      rows: (eventPlan.rows || []).map(r => ({
        name: r.event?.name,
        date: r.event?.date ?? null,
        dateEnd: r.event?.dateEnd ?? null,
        town: r.event?.town ?? null,
        tickable: r.tickable,
        recommended: r.recommended,
        note: r.note || "",
      })),
    },
    // ── WHY IT IS EMPTY, ON THE REPORT ITSELF ──────────────────────
    // The run that prompted this file had `rows: []` and nothing to say about
    // it, so the cause still had to be worked out by hand. An empty result is
    // the case a report is MOST useful for and was the one it explained least.
    coverage,
    pickedExtras,
    rows: (Array.isArray(matched) ? matched : []).map(p => rowReport(p, { wasNamed: named.has(p?.name) })),
  };
};

export const reportFilename = (at = "") => {
  const stamp = String(at).replace(/[:.]/g, "-").replace(/T/, "_").slice(0, 19) || "run";
  return `gemlyx-preview-${stamp}.json`;
};

// No dependency, no endpoint, no deploy. A Blob and an anchor.
export const downloadReport = (report, filename) => {
  if (typeof document === "undefined") return false;
  try {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || reportFilename(report?.at);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch { return false; }
};
