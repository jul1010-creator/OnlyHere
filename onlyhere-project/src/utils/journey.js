// ── WHAT A MEASURED JOURNEY ACTUALLY MEASURES ───────────────────────
//
// Oliver, 8 Aug 2026: "transport is constantly somewhat wrong. I don't
// understand why that is." With two examples from one draft:
//
//   "Direct trains run from København H to Odense in about 1h50min"
//        the Lyntog is about 1h22
//   "Odense railway station is about 5 minutes on foot from the city centre"
//        the station IS the city centre
//
// Both come from the same place, and the measurement is not wrong. The DRAFTING
// PIPELINE asks Google Directions for
//
//   origin      55.6761,12.5683   a point in central Copenhagen, not København H
//   destination the geocoded centroid of the town, not its station
//
// so the figure it gets back is DOOR TO DOOR: walk to the station, wait for the
// departure, ride, walk from the arrival station to wherever a geocoder decided
// the middle of the town is. For Copenhagen to Odense that is legitimately about
// 1h50 while the train itself is about 1h22. Then the writer was handed that
// number under the heading "BY PUBLIC TRANSPORT" and told to use it "for
// anything you say about getting there", so it wrote a sentence about TRAINS and
// attached a DOOR TO DOOR figure to it.
//
// This is the ranking bug wearing a timetable. The house rule already says a
// superlative is only true against a stated measure; a duration is exactly the
// same. 1h50 is true door to door and false for the train, and the sentence did
// not say which one it meant, so it could not be checked and it read as wrong to
// anyone who has taken the train.
//
// The second error is the same number's other half. The walk at the ends is
// measured from a geocoded CENTROID, which for a city of any size is an
// arbitrary point somebody's geocoder picked. "Five minutes from the city
// centre" is not a fact about Odense station, it is a fact about that point, and
// it is the "Nørreport, 9 mins walk" nearest-stop bug again in prose.
//
// So: split the journey into its named parts, hand the writer all of them with
// their names attached, and forbid the two sentences that conflate them. The
// numbers were always in the response; only the total was being passed on.

const mins = (s) => (Number.isFinite(Number(s?.mins)) ? Number(s.mins) : 0);

// Google's vehicle types, in the words a traveller uses.
const VEHICLE_WORD = {
  HEAVY_RAIL: "train", COMMUTER_TRAIN: "train", HIGH_SPEED_TRAIN: "train", LONG_DISTANCE_TRAIN: "train",
  RAIL: "train", METRO_RAIL: "metro", SUBWAY: "metro", TRAM: "tram", LIGHT_RAIL: "tram",
  BUS: "bus", INTERCITY_BUS: "bus", TROLLEYBUS: "bus", SHARE_TAXI: "bus",
  FERRY: "ferry", CABLE_CAR: "cable car", FUNICULAR: "funicular",
};
export const vehicleWord = (v) => VEHICLE_WORD[String(v || "").toUpperCase()] || "";

// Splits one Directions leg into the parts a sentence can honestly be built on.
// Returns null when there are no steps to read, because a made-up breakdown is
// worse than none: the caller then says only what it really has.
export const journeyParts = (steps, totalMinutes) => {
  const list = Array.isArray(steps) ? steps : [];
  if (!list.length) return null;
  const rides = list.filter(s => s.mode === "transit" && mins(s) > 0);
  const walks = list.filter(s => s.mode === "walking" && mins(s) > 0);
  const onBoard = rides.reduce((n, s) => n + mins(s), 0);
  const onFoot = walks.reduce((n, s) => n + mins(s), 0);
  const longest = rides.slice().sort((a, b) => mins(b) - mins(a))[0] || null;
  const total = Number.isFinite(Number(totalMinutes)) ? Number(totalMinutes) : onBoard + onFoot;
  return {
    total,
    onBoard,
    onFoot,
    // WAITING IS THE REST, and naming it matters: it is usually the difference
    // between the timetable and the journey, and it is the part a traveller can
    // shrink by checking departures. Never negative, because rounding each step
    // to whole minutes can otherwise overshoot the total by one.
    waiting: Math.max(0, total - onBoard - onFoot),
    changes: Math.max(0, rides.length - 1),
    longest: longest ? { mins: mins(longest), vehicle: vehicleWord(longest.vehicle), line: longest.line || "", from: longest.from || "", to: longest.to || "" } : null,
    vehicles: [...new Set(rides.map(s => vehicleWord(s.vehicle)).filter(Boolean))],
  };
};

const hm = (n) => {
  const t = Math.max(0, Math.round(Number(n) || 0));
  const h = Math.floor(t / 60), m = t % 60;
  return h ? `${h}h${m ? ` ${m}min` : ""}` : `${m}min`;
};

// The block handed to the writer. Every figure carries the name of what it
// measures, which is the whole fix.
export const journeyBlock = (parts) => {
  if (!parts) return "";
  const bits = [`DOOR TO DOOR: ${hm(parts.total)}. This is the whole journey between a point in central Copenhagen and a point in the middle of the destination, INCLUDING the walk at both ends and the wait for the departure. It is the figure travelTime takes.`];
  if (parts.longest) {
    const l = parts.longest;
    bits.push(`ON BOARD: ${hm(parts.onBoard)} of that is actually moving${parts.changes ? `, across ${parts.changes + 1} legs with ${parts.changes} change${parts.changes === 1 ? "" : "s"}` : ""}. The longest single leg is ${hm(l.mins)}${l.vehicle ? ` by ${l.vehicle}` : ""}${l.line ? ` on ${l.line}` : ""}${l.from && l.to ? `, ${l.from} to ${l.to}` : ""}.`);
  }
  if (parts.onFoot) bits.push(`ON FOOT: ${hm(parts.onFoot)} of walking across both ends combined.`);
  if (parts.waiting) bits.push(`WAITING: about ${hm(parts.waiting)} of connection and platform time.`);
  return bits.join("\n");
};
