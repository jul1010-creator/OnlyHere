// ── "DEMONSTRATE WHAT HAS CHANGED AND EXPLAIN IF IT CAN AFFECT YOUR TRIP" ──
//
// Oliver, 5 Sep 2026, with a screenshot of Facebook's account menu: "Replace
// this with the burger menu if you got an account and then put saved trips into
// it. And when you get a notification, you get a '1' or '2' flashing on the
// 'saved trips'. And when you click it, the notification is considered read...
// However, you need to demonstrate what has changed and explain if it can
// affect your trip."
//
// The last sentence is the whole of this file. Everything before it is where the
// notice lives; this is what the notice is worth.
//
// ── WHAT THE OLD NOTICE WAS MISSING ─────────────────────────────────
//
// It had already been through two rounds. First it said "Day 1 now looks clearer
// than before", which is the shape of a fact without being one. Then it said
// "Day 1: 1.6 mm of rain, 18 degrees, 4 m/s wind. It was dry when the guide was
// built", which is true, specific, and still leaves the traveller to work out
// whether any of it matters.
//
// 1.6 mm on a day of four museums is nothing. 1.6 mm on a day of a beach, a
// cliff walk and a harbour, for somebody on a bicycle, is the day. The app knows
// which of those it is, and was not saying.
//
// ── AND IT DOES NOT INVENT THE ANSWER ───────────────────────────────
//
// Two things it already holds, joined:
//
//   dayWarnings (utils/weatherWarn.js) turns a forecast into sentences and is
//   already tuned to the travel mode, so a cyclist and a driver get different
//   answers about the same wind. Those sentences are written, argued over and
//   asserted; nothing here rewrites them.
//
//   stopKind (utils/guideReading.js) already names what each stop IS, from the
//   name and the published row. A Beach is outdoors and a Museum is not, and
//   counting them is arithmetic rather than a judgement.
//
// Where the kinds are unknown it says they are unknown. A day of four stops this
// file cannot classify gets "we cannot tell how much of that day is outdoors"
// rather than a confident half.
import { dayWarnings } from "./weatherWarn";

// ── WHAT IS OUTDOORS ────────────────────────────────────────────────
//
// From the labels stopKind already produces, not from a new vocabulary. Adding a
// kind there and forgetting it here is the one way this can drift, so the suite
// asserts that every label stopKind can return is named in exactly one of these
// two sets or is deliberately left unknown.
export const OUTDOOR_KINDS = new Set([
  "Beach", "Cliffs", "Forest", "Gardens", "Park", "Harbour", "Square", "Street",
  "Bar street", "Ramparts", "Lighthouse", "Campsite", "Bridge", "Lake", "Zoo",
  "Ferry port", "Mill", "Town",
  // Found by the assertion below on its first run, which is what it is for: the
  // reader had seven labels this file had never heard of, and an unheard-of
  // label reads as unknown, which is safe and silent.
  "Old town", "Chalk quarry", "Festival",
]);
export const INDOOR_KINDS = new Set([
  "Museum", "Gallery", "Church", "Cathedral", "Castle", "Palace", "Manor house",
  "Tower", "Restaurant", "Bar", "Workshop", "Station", "Airport", "Free to enter",
  "Round church", "Viking ship museum", "Aquarium", "Abbey",
]);

export const OUTDOOR = "outdoor";
export const INDOOR = "indoor";
export const UNKNOWN = "unknown";

export const stopExposure = (kind) => {
  const k = String(kind ?? "").trim();
  if (!k) return UNKNOWN;
  if (OUTDOOR_KINDS.has(k)) return OUTDOOR;
  if (INDOOR_KINDS.has(k)) return INDOOR;
  return UNKNOWN;
};

// How much of one day is spent outside. Counts, not a ratio, because "3 of 4"
// is a sentence a reader can check against their own plan and "75%" is not.
export const dayExposure = (kinds) => {
  const list = Array.isArray(kinds) ? kinds : [];
  const out = { outdoor: 0, indoor: 0, unknown: 0, total: list.length };
  for (const k of list) out[stopExposure(k)] += 1;
  return out;
};

// ── DOES IT MATTER ──────────────────────────────────────────────────
//
// Three answers and no fourth. "Matters" is worth interrupting somebody for,
// "minor" is worth knowing and not worth acting on, and "unknown" is what an
// honest system says when it cannot tell, rather than picking one.
export const MATTERS = "matters";
export const MINOR = "minor";
export const BETTER = "better";
export const UNSURE = "unsure";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const changeImpact = ({ exposure = null, warnings = [], oldRisk = "", newRisk = "" } = {}) => {
  const w = (Array.isArray(warnings) ? warnings : []).filter(Boolean);
  // A warn level warning is the strongest thing the app knows how to say about a
  // day, and it already says it in a sentence written for the traveller's own
  // mode of travel. Repeating it in this file's words would be a second opinion
  // from the same source.
  const hard = w.find(x => x.level === "warn");
  if (hard) return { level: MATTERS, line: hard.text || "", from: "warning" };

  const e = exposure || { outdoor: 0, indoor: 0, unknown: 0, total: 0 };
  const known = e.outdoor + e.indoor;

  // Rain went away. Worth saying, because a traveller who moved their outdoor
  // day once should be told they need not have.
  if (oldRisk === "high" && newRisk !== "high") {
    return {
      level: BETTER,
      line: e.outdoor > 0
        ? `That frees up the outdoor part of the day: ${plural(e.outdoor, "stop is", "stops are")} outside.`
        : "The rain that was forecast for that day has gone.",
      from: "risk",
    };
  }

  if (newRisk === "high") {
    if (!e.total) return { level: UNSURE, line: "That day has no stops on it yet, so there is nothing to move.", from: "empty" };
    // Nothing classifiable. Said plainly rather than guessed: a confident half is
    // worse than an admission, and this file would rather be dull than wrong.
    if (!known) return { level: UNSURE, line: `We cannot tell how much of that day is outdoors, so this is worth a look at the ${plural(e.total, "stop", "stops")} yourself.`, from: "unknown" };
    if (e.outdoor === 0) return { level: MINOR, line: `Every stop we can place that day is indoors, so rain changes little.`, from: "exposure" };
    if (e.outdoor >= e.indoor) {
      return {
        level: MATTERS,
        line: `${plural(e.outdoor, "stop", "stops")} of ${e.total} that day ${e.outdoor === 1 ? "is" : "are"} outdoors, so this one is worth moving things around for.`,
        from: "exposure",
      };
    }
    return {
      level: MINOR,
      line: `${plural(e.outdoor, "stop", "stops")} of ${e.total} that day ${e.outdoor === 1 ? "is" : "are"} outdoors, and the rest is inside.`,
      from: "exposure",
    };
  }

  // A watch level warning with no risk flip: something crossed a threshold that
  // is worth knowing without being worth rearranging a day for.
  const soft = w[0];
  if (soft) return { level: MINOR, line: soft.text || "", from: "warning" };
  return { level: MINOR, line: "", from: "none" };
};

// ── AND HOW IT IS LABELLED ──────────────────────────────────────────
//
// One word each, because the row is read at a glance before it is read at all.
export const IMPACT_LABEL = {
  [MATTERS]: "Worth changing something",
  [MINOR]: "Worth knowing",
  [BETTER]: "Better than planned",
  [UNSURE]: "Have a look",
};
export const impactLabel = (level) => IMPACT_LABEL[level] || IMPACT_LABEL[MINOR];

// ── THE WHOLE RECORD THE PAGE SHOWS ─────────────────────────────────
//
// `was` and `now` are both given, because "demonstrate what has changed" means
// showing the two states rather than describing the difference. A traveller who
// remembers packing for a dry Tuesday needs to see the dry Tuesday.
//
// `kindOf` is injected so this file does not import the guide reader and the
// published rows: the caller already has both in hand, and one function that
// takes the kinds is testable without a single row in the database.
export const tripChange = ({
  guideId = "", guideTitle = "", dayIndex = 0, startsInDays = null,
  oldRisk = "", newRisk = "", slot = null, stopKinds = [], mode = null, day = null,
} = {}) => {
  const exposure = dayExposure(stopKinds);
  const warnings = day ? dayWarnings(day, { mode }) : [];
  const impact = changeImpact({ exposure, warnings, oldRisk, newRisk });
  return {
    guideId,
    guideTitle,
    dayLabel: `Day ${Number(dayIndex) + 1}`,
    startsInDays,
    was: riskWords(oldRisk),
    now: riskWords(newRisk),
    slot,
    exposure,
    level: impact.level,
    label: impactLabel(impact.level),
    line: impact.line,
  };
};

// The stored risk is a three state key and a reader has never seen it. One word
// each, and the same word on both sides so the two states can be compared at a
// glance rather than parsed.
export const riskWords = (risk) =>
  risk === "high" ? "rain" : risk === "low" ? "cloud" : "dry";
