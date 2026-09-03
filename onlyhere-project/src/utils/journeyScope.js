// ── "I DON'T THINK BAR STREETS SHOULD HAVE DISTANCE FROM COPENHAGEN" ─
//
// Oliver, 3 Sep 2026: "Only towns should." Then, asked where attractions
// belong: "depends with attractions. People will be more interested in knowing
// how far Legoland is from the city center." Then, settling it:
//
//   "Actually, only make it towns. Nighttown shouldn't have any. The rest
//    should be calculated from city center."
//
// That is three buckets, and the third is where nearly everything lands.
//
// ── A JOURNEY ANSWERS A QUESTION, AND IT IS NOT ALWAYS THE SAME ONE ─
//
// "3h 35min from Copenhagen, door to door" is the whole planning question for
// Ribe: a reader is deciding whether to go to that town at all. It is the WRONG
// question on Jomfru Ane Gade, because nobody travels from Copenhagen to a bar
// street — they are already in Aalborg, and the trip they cared about was
// answered on Aalborg's own entry. The question left on the street is "how far
// is it from where I am staying", and the honest proxy for that is the middle
// of the city it is in.
//
// It is worse than the wrong question when it is wrong. Two of Oliver's bar
// streets shipped with a Copenhagen Metro M3 leg on them — Rådhuspladsen to
// Gammel Strand, five minutes — for streets in Odense and Aarhus.
//
// ── AND A NIGHTLIFE TOWN IS ASKED NEITHER ───────────────────────────
//
// "Nighttown shouldn't have any." A nightlife town is not somewhere you travel
// TO on its own account — it is the answer to "which town has a night out",
// and the reader who picks one then opens the town entry, which is measured.
// Measuring it here would print the same figure twice under two headings.
//
// ── DERIVED, BECAUSE THIS CODEBASE HAS THE SCAR ─────────────────────
//
// The obvious shape is a map of ten types to three answers. This file wrote one
// yesterday and it was already a hand-written list copied from CONTENT_TYPES,
// which is the exact shape of the bug recorded in regions.js: "Four lists, one
// omission, which is not four mistakes. It is one hand-written list copied four
// times." So only the EXCEPTIONS are named, and the rule Oliver stated in words
// — "the rest should be calculated from city center" — is the fallthrough. A
// content type added next month gets the majority answer instead of silently
// getting none, and nobody has to remember this file exists.
import { CONTENT_TYPES } from "./sourcePolicy";
import { haversineKm } from "./helpers";

export const JOURNEY_ORIGINS = ["origin", "town"];

// Named `origin` rather than `copenhagen`, because helpers.js already calls it
// TRAVEL_ORIGIN and a second name for the same place is how two of them drift.
const FROM_THE_ORIGIN = ["town"];

// nightTown: his words, above.
// essential: tax-free shopping is not somewhere with a coordinate. It was
// already the one type outside PLACE_TYPES_WITH_A_JOURNEY and stays outside.
const NO_JOURNEY_AT_ALL = ["nightTown", "essential"];

export const journeyOriginFor = (type) => {
  const t = String(type || "").trim();
  // An unrecognised string is not a content type, and inventing a journey for
  // it would be the same as inventing the type.
  if (!CONTENT_TYPES.includes(t)) return "";
  if (NO_JOURNEY_AT_ALL.includes(t)) return "";
  return FROM_THE_ORIGIN.includes(t) ? "origin" : "town";
};
export const showsJourney = (type) => !!journeyOriginFor(type);

// ── THE RENDER VOCABULARY IS NOT THE STUDIO VOCABULARY ──────────────
//
// DetailPage is handed `kind` — event, town, nightlife, free, food, craft —
// which is what the app calls a page, while the pipeline works in CONTENT_TYPES
// — festival, nightStreet, foodStreet and the rest. The two have never been the
// same list and this file needs both: the measurement is gated on the Studio
// type and the CARD is gated on the render kind.
//
// Gating the card is what fixes the rows already published. Oliver's two wrong
// journeys are live in Supabase right now, and this codebase has settled that
// argument twice before — "suppressing it at RENDER so all 71 published entries
// were fixed at once rather than needing 71 redrafts."
//
// nightTown and essential are absent from this list on purpose and it costs
// nothing: placeUrl.js records that "nightTown and essential are absent on
// purpose: neither opens as a page in the app", so no kind maps to them. The
// stored journey on an old nightTown row simply stops being rendered anywhere.
const KIND_ORIGIN = { town: "origin" };
const RENDER_KINDS = ["town", "event", "free", "food", "nightlife", "craft"];

export const journeyOriginForKind = (kind) => {
  const k = String(kind || "").trim();
  if (!RENDER_KINDS.includes(k)) return "";
  return KIND_ORIGIN[k] || "town";
};
export const showsJourneyForKind = (kind) => !!journeyOriginForKind(kind);

// ── AND A NEW TYPE HAS TO BE CLASSIFIED ─────────────────────────────
//
// The partition, so the suite can assert that every content type is either
// given a journey or deliberately refused one, and that the refusals are
// exactly the two he named rather than whatever the fallthrough happens to do.
export const TYPES_WITH_A_JOURNEY = CONTENT_TYPES.filter(t => showsJourney(t));
export const TYPES_WITHOUT_A_JOURNEY = CONTENT_TYPES.filter(t => !showsJourney(t));
export const TYPES_MEASURED_FROM_THE_ORIGIN = CONTENT_TYPES.filter(t => journeyOriginFor(t) === "origin");
export const TYPES_MEASURED_FROM_THEIR_TOWN = CONTENT_TYPES.filter(t => journeyOriginFor(t) === "town");

// ── AND THE DECISION ITSELF, WHERE IT CAN BE CALLED ─────────────────
//
// This lived in App.jsx as an if/else beside the Directions call, and the
// assertion covering it was a regex over the comment above it. A mutant that
// added ONE LINE to the else branch — `journeyFrom = { point:
// TRAVEL_ORIGIN_POINT, name: "Copenhagen" }`, which is precisely the bug this
// whole change exists to remove — passed all 11,965 assertions, because the
// comment it was pinned to was still there.
//
// "A probe built from invented inputs is not a probe." Same lesson, one level
// up: an assertion built from a regex over a comment is not an assertion. So
// the decision is a function, the caller does the async lookups and hands it
// what it found, and the test calls it with a bar street and no town centre.
//
// Under this, the place IS the centre and there is no journey to state. A bar
// street measured from its own city centre is a walk across the square, and
// "3min from Aalborg, door to door" is a sentence about nothing dressed up as
// a measurement.
export const IS_THE_CENTRE_KM = 1;

// Central Copenhagen. Named `origin` rather than `copenhagen` everywhere else
// in this file for the reason at FROM_THE_ORIGIN; the point itself is spelled
// out once, here.
export const TRAVEL_ORIGIN = { lat: 55.6761, lon: 12.5683, name: "Copenhagen" };

const point = (c) => `${c.lat},${c.lon}`;

// Returns { point, name } or null. NULL IS A REAL ANSWER and the caller must
// treat it as one: no measurement, no Directions call, no travel figure. The
// one thing it must never do is retry from Copenhagen.
export const journeyOriginPoint = (type, { townName = "", townCentre = null, destination = null } = {}) => {
  const wants = journeyOriginFor(type);
  if (!wants) return null;
  if (wants === "origin") return { point: point(TRAVEL_ORIGIN), name: TRAVEL_ORIGIN.name };
  const name = String(townName || "").trim();
  const lat = Number(townCentre?.lat), lon = Number(townCentre?.lon);
  // No town, or no centre for it. Refusing is the safe direction: a missing
  // journey costs a card. A journey from the wrong end of the country costs
  // the reader an afternoon.
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const dLat = Number(destination?.lat), dLon = Number(destination?.lon);
  if (Number.isFinite(dLat) && Number.isFinite(dLon)) {
    const km = haversineKm({ lat, lon }, { lat: dLat, lon: dLon });
    if (Number.isFinite(km) && km < IS_THE_CENTRE_KM) return null;
  }
  return { point: point({ lat, lon }), name };
};
