// ── THE GUIDE, OUTSIDE DENMARK ──────────────────────────────────────
//
// Phase 3 of LITHUANIA_PLAN_29SEP.md. Oliver, 29 Sep 2026: "Leave out the Chat
// Assistant.. I doubt anyone will use it tbh.. but yes, start phase 3."
//
// In Denmark a guide is built out of a conversation: the trip form sends a
// hidden turn, the assistant answers with the places it holds, and the planner
// is told to use "only real place names mentioned in the conversation". With
// no chat there is no assistant turn to name any places, so the planner would
// have nothing to choose from. Three things here replace what the chat did:
//
//   abroadBriefParts   the trip form, as the one turn the planner reads
//   inventoryBlock     every published place in the country, which is what the
//                      chat's system prompt used to put in front of it
//   forLand            the Danish prompts, made to speak about this country
//
// Nothing here runs on the Danish page. Every caller asks PAGE_ABROAD first,
// and forLand hands a Danish prompt back untouched.
import { countryProfile, DEFAULT_COUNTRY } from "./countries";

// ── WHERE A VISITOR STARTS ──────────────────────────────────────────
// The Danish form asks for a free-text starting point and assumes Copenhagen
// Airport when it is blank. Klaipėda's visitors arrive three ways the tourism
// centre deals with every day, so those are chips, with a free field for the
// rest. `say` is what the planner reads.
export const ABROAD_STARTS = {
  LT: [
    { key: "cruise", label: "🚢 Cruise ship", say: "the Klaipėda cruise ship terminal" },
    { key: "station", label: "🚉 Bus or train station", say: "Klaipėda bus and train station" },
    { key: "hotel", label: "🛏️ My hotel", say: "their hotel in Klaipėda" },
  ],
};
export const startsFor = (code) => ABROAD_STARTS[code] || [];

// Getting around, in the words that fit a city visit. Kept apart from the
// Danish three, which feed the Danish budget estimate.
export const ABROAD_TRANSPORT = ["🚶 On foot", "🚌 Bus", "🚲 Bike", "🚗 Car"];
export const ABROAD_INTERESTS = ["History", "Nature", "Food", "Nightlife"];

const two = (n) => String(n).padStart(2, "0");
const clock = (d) => `${two(d.getHours())}:${two(d.getMinutes())}`;
const longDate = (d) => d.toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Hours between two datetimes on the same calendar day, or null.
export const sameDayHours = (arrival, departure) => {
  const a = new Date(arrival), b = new Date(departure);
  if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime()) || b <= a) return null;
  if (a.toDateString() !== b.toDateString()) return null;
  return Math.round(((b - a) / 36e5) * 2) / 2;
};

// ── THE FORM, AS THE ONE TURN THE GUIDE READS ───────────────────────
// Same "Label: value" parts the Danish form sends, joined the same way, so
// readBrief and the preview read it with no change. Returns [] until both
// dates are there: a plan needs to know when it starts and when it has to end.
export const abroadBriefParts = ({
  land = countryProfile("LT"), arrival, departure, days = null, start = "", startText = "",
  travelers = "", counted = null, kids = false, interests = [], transport = [],
  freeOnly = false, events = false, saved = [],
} = {}) => {
  const a = arrival ? new Date(arrival) : null;
  const b = departure ? new Date(departure) : null;
  if (!a || !b || !Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime())) return [];
  const parts = [`Arriving: ${longDate(a)}`, `Departing: ${longDate(b)}`];
  const hours = sameDayHours(arrival, departure);
  if (hours !== null) {
    parts.push(`A single visit of about ${hours} hours, from ${clock(a)} to ${clock(b)} on the same day. Plan only inside that window, and have them back at the starting point at least 45 minutes before ${clock(b)}`);
  } else if (days) {
    parts.push(`Exact trip length: ${days} day${days !== 1 ? "s" : ""}`);
  }
  const chip = startsFor(land.code).find(s => s.key === start);
  const typed = String(startText || "").trim();
  if (chip) parts.push(`Starting point: ${chip.say}${typed ? ` (${typed})` : ""}`);
  else if (typed) parts.push(`Starting point: ${typed}`);
  else parts.push(`Starting point: not specified, assume the old town centre of the town the published places are in`);
  const who = String(travelers || "").trim();
  if (who) parts.push(`Who's traveling: ${who}${counted ? ` (that is ${counted} ${counted === 1 ? "person" : "people"} in total, counted from what they typed: use this number and do not work out your own)` : ""}`);
  if (kids) parts.push("Traveling with kids, family-friendly plan");
  if (interests.length) parts.push(`Interests: ${interests.join(", ")}`);
  if (transport.length) parts.push(`Getting around: ${transport.map(t => t.replace(/^\S+\s/, "")).join(", ")}`);
  if (freeOnly) parts.push("Only attractions that are free to enter: do not plan a stop that charges admission, and say so if something they would expect to see is behind a ticket.");
  if (events) parts.push("Include real events happening during the trip dates, if any fit");
  if (saved.length) parts.push(`Also include these saved places: ${saved.map(p => p.town ? `${p.name} (${p.town})` : p.name).join(", ")}`);
  return parts;
};

// ── EVERY PUBLISHED PLACE, FOR THE PLANNER ──────────────────────────
// What the Danish chat's system prompt listed, drawn from the same arrays
// liveContent filled for this country and no other. One line each, with only
// the fields a planner needs to put a stop on a day: where, what, when open,
// what it costs. Capped, because a pilot city is small and a long list is a
// prompt nobody reads to the end.
export const INVENTORY_CAP = 150;
const clip = (s, n) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1).trim()}…` : t;
};
export const inventoryLine = (row, kind) => {
  if (!row?.name) return "";
  const where = row.town || row.city || row.location || "";
  const bits = [
    kind,
    where && `in ${where}`,
    row.date && `on ${row.date}${row.dateEnd ? ` to ${row.dateEnd}` : ""}`,
    row.hours && `open ${clip(row.hours, 80)}`,
    (row.price || row.ticketsGlance || row.ticketInfo || row.priceNote) && `price ${clip(row.price || row.ticketsGlance || row.ticketInfo || row.priceNote, 60)}`,
  ].filter(Boolean);
  const what = clip(row.desc || row.gemlyxFind || "", 140);
  return `- ${row.name} (${bits.join(", ")})${what ? `: ${what}` : ""}`;
};
export const inventoryBlock = (pools = {}, land = countryProfile("LT")) => {
  const lines = [];
  for (const [kind, rows] of Object.entries(pools)) {
    for (const row of (Array.isArray(rows) ? rows : [])) {
      const line = inventoryLine(row, kind);
      if (line) lines.push(line);
      if (lines.length >= INVENTORY_CAP) break;
    }
    if (lines.length >= INVENTORY_CAP) break;
  }
  if (!lines.length) return "";
  return `\n\nTHE PLACES GEMLYX HAS PUBLISHED IN ${land.name.toUpperCase()}. These are the ONLY places a stop may be. Choose from this list by what the traveller asked for and by what is open on their dates, use each name exactly as written here, and never add a place that is not on it:\n${lines.join("\n")}`;
};

// ── THE DANISH PROMPTS, SPEAKING ABOUT THIS COUNTRY ─────────────────
// The guide's prompts are long and were written for Denmark, and most of what
// ties them to it is the words: "a Denmark trip", "the real Danish town",
// "every price is in DKK". Those are swapped. What cannot be swapped is the
// Danish knowledge in them (Rejsekort, DSB, Jutland and Zealand, the island
// ferries, the sommerhus), and a model told "Lithuanian geography
// (Copenhagen/Zealand is a different region from Jutland)" is being told
// nonsense. So the prompt also carries, at the end where it is read last, a
// rule that every Danish fact in it is an example of shape and not a fact
// about this trip.
export const landRules = (land) => `\n\nTHIS TRIP IS IN ${land.name.toUpperCase()}, NOT DENMARK. Every price is in euros (EUR, written €). Times are local ${land.name} time. Anything in the instructions above about Denmark is there only as an example of the shape of an answer and is not a fact about this trip: Copenhagen, Danish regions (Jutland, Zealand, Funen), Danish islands and ferries, sommerhus rentals, Danish transport (DSB, Rejsekort, Rejseplanen, Kombardo, the Copenhagen Card) and Danish kroner never appear in this guide. Do not invent a ${land.adjective} equivalent for any of them. For getting around, use walking, the local buses and taxis or ride hailing, and name a bus line only if the traveller's material names it.`;

export const forLand = (prompt, land) => {
  const text = String(prompt ?? "");
  if (!land || land.code === DEFAULT_COUNTRY) return text;
  const swapped = text
    .replace(/\bDenmark's\b/g, `${land.name}'s`)
    .replace(/\bDenmark\b/g, land.name)
    .replace(/\bDanish\b/g, land.adjective)
    .replace(/\bDanes\b/g, "locals")
    .replace(/\bDKK\b/g, "EUR");
  return `${swapped}${landRules(land)}`;
};

// Wraps an AI call so every prompt it sends goes through forLand. The Danish
// page gets the call back unchanged.
export const landAsk = (fn, land) => (!land || land.code === DEFAULT_COUNTRY)
  ? fn
  : (prompt, ...rest) => fn(forLand(prompt, land), ...rest);
