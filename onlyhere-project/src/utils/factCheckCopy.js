// ── "SO I ONLY COPY WHAT I NEED TO HAVE FACT-CHECKED" ────────────────
//
// Oliver, 21 Aug 2026: "then make a 'copy' option. So I only copy what I need
// to have fact-checked by Gemini." And, when asked what he does today:
// "Because I usually copy the whole draft."
//
// The whole draft is the JSON, and the JSON is mostly plumbing. A Gilleleje
// draft is about nine hundred words of prose inside four thousand words of
// __journey legs, __sources, __priceSource, __notes, coordinates, emoji, folded
// themes and glance fields. Pasting all of it asks a second model to read our
// bookkeeping and guess which parts are claims.
//
// ── AND LESS IS NOT THE SAME AS BLIND ────────────────────────────────
// The obvious version of this strips everything but the prose. It is the wrong
// version, and his own report from 16 Aug says why:
//
//   "I asked gemini.. apparently it was correcting stuff that didn't need
//    correction, because it was already true."
//
// A checker with no idea which figures are measured argues with the measured
// ones. So the paste carries them, under a heading that says they are settled.
// That turns the second model from a guesser into a COMPARATOR, and the
// Gilleleje run is the proof: the draft's prose said "bus 950R" while
// __journey.legs[2] said {"vehicle": "train", "line": "950R"} four hundred
// characters further down the same file. Both were in front of him and neither
// was in front of anything that compared them.
//
// The third block is the same idea pointed at ourselves. Our own gates had
// already flagged two claims on that draft and the correction pass failed to
// remove them. Saying so stops the checker spending its answer on what we
// already know and lets it look for what we missed.
import { hostOf } from "./pageScan";

// ── AN ALLOW-LIST WOULD BE THE WRONG SHAPE HERE ─────────────────────
// shapeForLiveFields is an allow-list because it writes to the database and a
// field nobody named must not reach a reader. This writes to a clipboard. The
// failure that matters is the opposite one: a claim that quietly does not get
// checked because somebody added a prose field to a prompt and not to a list.
// So everything is a claim unless it is named here, and a new field arrives in
// the paste on the day it is invented.
// Exported 25 Aug 2026 so utils/evidence.js can ANSWER TO this list rather
// than keep a sixth copy of the same idea. Nothing else about it changed.
export const NOT_A_CLAIM = new Set([
  // Ours, not the world's.
  "id", "slug", "photo", "color", "emoji", "isClub", "isStreet", "isFoodStreet",
  "themes", "tags", "placeKind", "partOf", "dayTripFrom", "nomiPotential",
  "bookingType", "transportWarning", "popularityTag", "scale", "mapHint",
  // Shown in the measured block instead of the claims block.
  "travelTime", "lat", "lon", "nearestStation",
  // Shown in the context line instead.
  "name", "type", "town", "city", "region", "location", "website", "link", "linkAndroid",
]);

const LABEL = {
  tag: "Hook",
  characterAndFit: "Character and fit",
  whatToDo: "What to do",
  gettingThereReality: "Getting there, and the reality check",
  highlight: "Highlight",
  gemlyxFind: "Gemlyx find",
  thingsToKnow: "Things to know",
  uncertainties: "The draft says these are unconfirmed",
  typicalCosts: "Typical costs",
  recommendedStayGlance: "How long to stay",
  bestTimeGlance: "Best time",
  accommodationGlance: "Where to stay",
  realityCheck: "The reality check",
  whoItsFor: "Who it is for",
  whoFor: "Who it is for",
  atmosphere: "Atmosphere",
  special: "Being there",
  howItsMade: "How it is made",
  vibeLocation: "Vibe and location",
  bestTime: "Best time to go",
  bestNights: "Best nights",
  beforeDark: "Before dark",
  afterDark: "After dark",
  whenEnter: "When people arrive",
  walkIt: "Walking it",
  howTo: "How it works",
  visitorNote: "Note for visitors",
  ticketInfo: "Ticket info",
  camping: "Camping",
  accommodationTip: "Accommodation tip",
  ticketsGlance: "Tickets",
  extraCosts: "Extra costs",
  accessibility: "Accessibility",
  crowd: "Crowd",
  priceNote: "Price note",
  price: "Price",
  category: "Category",
  desc: "Description",
  date: "Start date",
  dateStart: "Start date",
  dateEnd: "End date",
  ticketStatus: "Ticket status",
  tier: "Gemlyx's own rating",
  tip: "Tip",
};

// "characterAndFit" -> "Character and fit". Only reached by a field with no
// entry above, which is the point: a prompt can grow a field tomorrow and it
// still comes out readable rather than being dropped or printed as camelCase.
const readable = (key) => LABEL[key]
  || String(key).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase()).toLowerCase()
    .replace(/^./, c => c.toUpperCase());

const text = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

const isPlainClaim = (v) => {
  if (typeof v === "string") return !!v.trim();
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.some(x => typeof x === "string" && x.trim());
  return false;
};

// ── THE MEASURED BLOCK, WHICH IS THE POINT OF THE WHOLE FILE ────────
// Written out in words rather than pasted as JSON, because a checker reads a
// sentence and skims a brace. The leg list is the part that earns its place:
// every one of these carries the vehicle Google returned, so a prose sentence
// naming the line and the wrong vehicle is a contradiction anybody can see.
const journeyLines = (j) => {
  if (!j || typeof j !== "object") return [];
  const out = [];
  const total = Number(j.total);
  const drive = Number(j.drivingMins);
  const hm = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min`.replace(" 0min", "") : `${m}min`);
  if (Number.isFinite(total)) out.push(`Door to door from ${text(j.from) || "Copenhagen"}: ${hm(total)}, of which ${hm(Number(j.onBoard) || 0)} on board, ${hm(Number(j.onFoot) || 0)} on foot and ${hm(Number(j.waiting) || 0)} waiting.`);
  if (Number.isFinite(drive)) out.push(`Driving the same journey: ${hm(drive)}.`);
  const legs = Array.isArray(j.legs) ? j.legs : [];
  if (legs.length) {
    out.push("The legs, each one as Google returned it:");
    for (const l of legs) {
      const line = text(l?.line);
      out.push(`  ${text(l?.vehicle) || "leg"}${line ? ` ${line}` : ""}: ${text(l?.from)} to ${text(l?.to)}, ${Number(l?.mins) || 0} min`);
    }
  }
  return out;
};

// `now` is passed in rather than read, so the same draft produces the same
// paste twice and a test does not have to freeze the clock.
export const factCheckCopy = (draft, { type = "", now = "" } = {}) => {
  const d = draft && typeof draft === "object" ? draft : {};
  const name = text(d.name) || "This entry";
  const where = text(d.town || d.city || d.region || d.location);
  const kind = text(type) || text(d.type);

  const out = [];
  out.push(`${name}${kind ? ` (${kind})` : ""}${where ? `, ${where}` : ""}${now ? `, drafted ${now}` : ""}`);
  out.push("");
  out.push("CHECK THESE CLAIMS. Every line below was written by a model and may be wrong.");
  out.push("");

  const claims = Object.keys(d)
    .filter(k => !k.startsWith("_") && !NOT_A_CLAIM.has(k) && isPlainClaim(d[k]));
  for (const k of claims) {
    const v = d[k];
    if (Array.isArray(v)) {
      out.push(`${readable(k)}:`);
      for (const item of v) if (text(item)) out.push(`  ${text(item)}`);
    } else {
      out.push(`${readable(k)}: ${text(v)}`);
    }
  }

  // ── AND ONLY WHAT REALLY WAS MEASURED GOES UNDER THAT HEADING ─────
  // The first version of this printed travelTime, the coordinates and the
  // nearest station under "DO NOT CORRECT", unconditionally. An adversarial
  // pass found what that costs, and it is the exact inverse of this file's
  // purpose. App.jsx has a branch that keeps the MODEL'S travel time when
  // neither transport mode returned a usable duration, and logs it in its own
  // words: "This number is WRITTEN, not measured." The whole journey step is
  // also inside a type gate, so an entry type with no journey never has any of
  // this touched and the model supplies its own.
  //
  // So a paste built the naive way instructs a second model not to correct
  // precisely the invented figures this tool exists to catch.
  //
  // The rule now: a figure goes under that heading when the payload carries the
  // RECORD of the measurement that produced it, and nowhere else. __journey is
  // the record for the journey and for the travel time it overruled;
  // __priceSource is the record for the price. Nothing records that a
  // coordinate was geocoded rather than written, so the coordinate is stated
  // plainly, without the instruction.
  const journey = d.__journey && typeof d.__journey === "object" ? d.__journey : null;
  const measured = journeyLines(journey);
  if (journey && text(d.travelTime)) {
    measured.push(`Travel time as published: ${text(d.travelTime)}. Taken from the journey above, which overrules whatever the writer estimated.`);
  }
  const ps = d.__priceSource;
  if (ps && text(ps.price)) measured.push(`Ticket price ${text(ps.price)}, read off ${text(ps.url) || text(ps.host) || "the page it was taken from"}.`);
  if (measured.length) {
    out.push("");
    out.push("DO NOT CORRECT ANYTHING BELOW THIS LINE. It was measured, not written.");
    out.push("Google Directions and a page we actually opened produced these.");
    out.push("If a claim above contradicts one of them, that is the finding worth reporting.");
    out.push("");
    out.push(...measured);
  }

  // Stated, not vouched for. A reader of this paste should know where the pin
  // is; a checker should not be told the pin is beyond question, because
  // nothing in the payload says who put it there.
  const recorded = [];
  const lat = Number(d.lat ?? d.__lat), lon = Number(d.lon ?? d.__lon);
  if (Number.isFinite(lat) && Number.isFinite(lon)) recorded.push(`Coordinates on the entry: ${lat}, ${lon}${text(d.mapHint) ? ` (${text(d.mapHint)})` : ""}.`);
  if (text(d.nearestStation)) recorded.push(`Nearest arrival point on the entry: ${text(d.nearestStation)}.`);
  if (!journey && text(d.travelTime)) recorded.push(`Travel time on the entry: ${text(d.travelTime)}. NOTHING RECORDS THIS AS MEASURED, so it is a claim like the rest.`);
  if (recorded.length) {
    out.push("");
    out.push("ALSO ON THE ENTRY, with no record of where it came from:");
    out.push("");
    out.push(...recorded);
  }

  const notes = (Array.isArray(d.__notes) ? d.__notes : []).map(text).filter(Boolean);
  if (notes.length) {
    out.push("");
    out.push("OUR OWN CHECKS ALREADY FLAGGED THESE, so there is no need to repeat them:");
    out.push("");
    for (const nline of notes) out.push(`  ${nline}`);
  }

  const sources = (Array.isArray(d.__sources) ? d.__sources : []).map(text).filter(Boolean);
  if (sources.length) {
    // Hosts, not URLs. The checker wants to know whose word this is standing on,
    // and eight full tripadvisor URLs answer that worse than eight names do.
    const hosts = [...new Set(sources.map(u => hostOf(u) || u))];
    out.push("");
    out.push(`Read while drafting: ${hosts.join(", ")}.`);
  }

  out.push("");
  out.push("WHAT A USEFUL ANSWER LOOKS LIKE: name the claim, say what is wrong with it,");
  out.push("and give the page you read the correct version on. Say nothing about the");
  out.push("claims that are right, and do not rewrite the prose.");
  return out.join("\n");
};
