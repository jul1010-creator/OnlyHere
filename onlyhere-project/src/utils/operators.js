// ── "PERHAPS REFER THEM TO FLIXBUS OR DSB. OR THE FERRY" ────────────
//
// Oliver, 9 Aug 2026: "if the distance is long like from Copenhagen to Odense
// or Copenhagen to Randers, perhaps refer them to Flixbus or DSB. Or if you go
// to an island, refer them to the ferry. If that is possible, of course."
//
// He is right that a leg chip saying "~1h30 by train/bus" is a fact and not an
// action. Somebody reading it still has to work out who sells that ticket. The
// Maps link is the wrong place to send them: Google will show them the journey
// and cannot sell them a seat on it.
//
// ── WHAT THIS FILE WILL AND WILL NOT NAME ───────────────────────────
// His "if that is possible, of course" is the important half of the ask, and
// the answer is different for the two cases.
//
// TRAINS AND COACHES: yes, confidently. Denmark has a national rail operator
// and one dominant long-distance coach operator, and they serve every long
// domestic hop this app plans. Naming them is safe because the answer does not
// change with the route.
//
// FERRIES: NO OPERATOR NAME, and that is a decision rather than laziness.
// Checked while writing this, Samsø alone is served by TWO different companies
// on TWO different routes, from opposite sides of the country: Samsø Færgen
// from Hou on the Jutland side, and Samsølinjen from Kalundborg on Zealand.
// Picking one and printing it as "the ferry to Samsø" could send somebody
// across the Great Belt in the wrong direction.
//
// This is not a new opinion either, it is already the standing rule in
// STUDIO_VOICE: "never write one route as 'the' way to an island when more than
// one exists", and the operator's own site outranks everything else. A hardcoded
// table here would break that rule quietly, in a file nobody re-reads, and go
// stale the first time a route changes hands.
//
// So a crossing gets the national planner, which covers every operator
// including the boats, plus the one thing that is true of all of them and
// genuinely decision-changing: which port you leave from depends on where you
// are coming from, and summer sailings sell out.
//
// ── THE THRESHOLD ───────────────────────────────────────────────────
// 100 km of straight-line distance. Copenhagen to Odense is about 135 km and
// Copenhagen to Randers about 220, both of his examples, and both are journeys
// where the choice between a train and a coach is a real choice about money and
// time. Below that it is regional travel where a ticket is a tap-in, and
// offering a booking site for a 30 km hop is noise.
import { WALK_MAX_KM } from "./guideEnrichment";
import { isFerryText } from "./helpers";

export const LONG_LEG_KM = 100;

export const OPERATORS = {
  dsb: {
    id: "dsb",
    name: "DSB",
    url: "https://www.dsb.dk/en/",
    what: "trains, the fast option",
  },
  flixbus: {
    id: "flixbus",
    name: "FlixBus",
    url: "https://www.flixbus.com/bus/copenhagen",
    what: "coaches, slower and usually cheaper",
  },
  // ── THE APP TOLD THE MODEL TO NAME IT AND THE CHIPS NEVER COULD ───
  //
  // The guide prompt has carried this as a frozen fact for weeks: "if the plan
  // contains a genuine long-distance crossing between regions, name Kombardo
  // Expressen or Flixbus as the real budget alternative to a full-fare train on
  // THAT leg." This table held DSB, FlixBus and Rejseplanen, so the one operator
  // the app singles out by name in prose was the one a leg chip could not offer.
  //
  // CHECKED 16 AUGUST 2026 against kombardoexpressen.dk's own front page, which
  // names Aarhus, Aalborg, København, Randers and Odense, and describes the
  // buses taking "a shortcut via the clever route over water". That is what it
  // is, and it is why it earns a row of its own next to FlixBus rather than
  // being folded into it: a coach with the ferry crossing inside one ticket, so
  // a reader does not book a bus and a boat separately.
  //
  // A note for whoever checks next, because handoff 13 warns against
  // "correcting" this. That handoff says the Bornholm route was renamed Bornholm
  // Expressen and moved to Vikingbus in December 2024; the operator's own site
  // today says its buses connect Bornholm with the rest of Denmark via
  // Bornholmslinjen to Rønne. THAT DISAGREEMENT IS NOT RESOLVED HERE and does
  // not need to be, which is the point of writing it down rather than picking a
  // side: a crossing to Bornholm is a ferry leg, and the ferry branch below
  // hands it to Rejseplanen without naming anybody.
  kombardo: {
    id: "kombardo",
    name: "Kombardo Expressen",
    url: "https://www.kombardoexpressen.dk/",
    what: "coach with the ferry crossing in the same ticket",
  },
  // The national journey planner. Covers every operator in the country at once,
  // trains, buses, the metro and the ferries, which is exactly why it is the
  // right answer for a crossing where naming one company would be a guess.
  rejseplanen: {
    id: "rejseplanen",
    name: "Rejseplanen",
    url: "https://www.rejseplanen.dk/webapp/index.html?language=en_EN",
    what: "every operator in one search",
  },
};

const isFerryLeg = (mode, how) => mode === "ferry" || isFerryText(how);

// ── WHEN IS A LEG A CROSSING BETWEEN REGIONS ────────────────────────
//
// The prompt's own rule is the one that matters and it is a rule about
// GEOGRAPHY, not about a route list: coach lines run the big crossings and the
// city-to-city corridors, and they do not run "internal short-haul commuter
// routes inside a single island or region". Copenhagen to Roskilde or Helsingør
// is a regional train, whatever its distance.
//
// So this asks whether the two ends sit on DIFFERENT LANDMASSES. Five of those
// exist, they are named by geography.js, and unlike a route they do not change
// hands. That distinction is why this is allowed to be a small fixed set while
// the ferry note twenty lines up refuses to name an operator at all: the ferry
// table would have gone stale, and Funen will not.
//
// LOLLAND-FALSTER IS OUT because the operator does not name it, and BORNHOLM IS
// OUT because a crossing to it is a ferry leg that never reaches this line. The
// cost of the landmass rule is Aalborg to Aarhus, a real Kombardo corridor with
// both ends in Jutland, which gets DSB and FlixBus and not this. A miss is the
// right way to be wrong here: a chip naming an operator that does not run the
// route is the failure this whole file was written to avoid.
const COACH_CROSSING_PARTS = new Set(["Zealand", "Funen", "Jutland"]);

export const isRegionCrossing = (fromPart, toPart) => {
  const a = String(fromPart || ""), b = String(toPart || "");
  // Inside one landmass it is a regional train, whatever the distance.
  if (a === b) return false;
  // AND UNKNOWN IS REFUSED BY THE SET RATHER THAN BY A GUARD ABOVE IT. A stop
  // that never resolved to a landmass gives "", which is not one of the three,
  // so it cannot pass. Written that way on purpose: an explicit `if (!a || !b)`
  // here reads as the load-bearing check and is not one, since the Set already
  // refuses "", and a mutation removing it changes no behaviour at all. One
  // check, and it is the one doing the work.
  return COACH_CROSSING_PARTS.has(a) && COACH_CROSSING_PARTS.has(b);
};

// ── WHO SELLS A TICKET FOR THIS LEG ─────────────────────────────────
// Returns an ordered list, or an empty one, and an empty one is the common and
// correct answer: somebody driving their own car does not need a booking site,
// and neither does somebody walking half a kilometre.
//
// `fromPart` and `toPart` are optional and default to unknown, so a caller that
// has not been taught to answer them gets exactly the list it got before.
export const operatorsForLeg = ({ km, mode, how, fromPart = "", toPart = "" } = {}) => {
  if (isFerryLeg(mode, how)) return [OPERATORS.rejseplanen];
  // A car or a bike is the traveler's own. Nobody sells them a seat.
  if (mode === "driving" || mode === "bicycling" || mode === "walking") return [];
  // km null means the two stops never resolved to coordinates we would trust.
  // Unknown is not long, so this stays quiet rather than offering a national
  // rail booking for what might be a walk across a square.
  if (!(Number(km) >= LONG_LEG_KM)) return [];
  // Beside FlixBus rather than after Rejseplanen, because it is the same kind of
  // answer as FlixBus and a reader comparing coach prices wants them together.
  const coaches = isRegionCrossing(fromPart, toPart)
    ? [OPERATORS.flixbus, OPERATORS.kombardo]
    : [OPERATORS.flixbus];
  return [OPERATORS.dsb, ...coaches, OPERATORS.rejseplanen];
};

// The one line printed beside the links. Different for a crossing, because the
// decision-changing fact about a Danish island ferry is not who runs it, it is
// that more than one route may serve the island and that summer fills up.
export const operatorNote = ({ mode, how } = {}) => {
  if (isFerryLeg(mode, how)) {
    return "Book the crossing, not just the bed. Danish island ferries run a handful of times a day and sell out in summer, and some islands are served from more than one port, so check which route suits where you are coming from.";
  }
  return "";
};

export const isLongLeg = (km) => Number(km) >= LONG_LEG_KM;

// Sanity, asserted rather than assumed: a leg cannot be both short enough to
// walk and long enough to need a national rail booking. If somebody ever tunes
// one of these two numbers toward the other, the suite says so.
export const THRESHOLDS_ARE_ORDERED = WALK_MAX_KM < LONG_LEG_KM;
