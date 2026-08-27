// ── "IS THAT POSSIBLE WITHOUT RUINING THE REST?" ────────────────────
//
// Oliver, 27 Aug 2026, wanting to redraft Copenhagen, Aalborg and Aarhus.
//
// It is a good question to ask before rather than after, and the honest answer
// is not "yes, should be fine". It is: HERE IS EXACTLY WHAT POINTS AT THIS TOWN,
// and here are the two fields that carry all of the risk.
//
// ── WHY THE BIG THREE ARE THE SCARY ONES ────────────────────────────
//
// Nothing in this app holds a foreign key. Every relationship between an entry
// and a town is matched BY NAME at render time, through samePlaceName, which is
// why København and Copenhagen resolve to one row. That design is what makes a
// redraft mostly safe — and it is also why the three towns with the most
// children are the three where a slip costs the most.
//
// Read off the code rather than guessed at, every relationship is one of these:
//
//   nightlife venues     grouped by townOfLocation(location) -> matched by NAME
//   bar streets          same, plus barsOnStreet matching town + street
//   scene guide          townPageFor(...) -> samePlaceName
//   partOf               a district saying it is INSIDE this town, by name
//   dayTripFrom          somewhere saying you sleep in this town, by name
//   the URL              /denmark/<placeSlug(name)>, derived from the name
//   the region filter    derived from the COORDINATE, never from region text
//   guides already built stops reference names, not ids
//
// EVERY ONE OF THEM READS THE NAME. Which is the useful conclusion:
//
//   change the prose      nothing breaks, that is the whole point of a redraft
//   change the name       every relationship above detaches at once, silently,
//                         and the URL moves, and the old address 404s
//   change the coordinate the region filter, the map pin, every distance
//
// Everything else on a town payload is prose or a glance value.
//
// ── AND NOTHING HERE PROMISES SAFETY ────────────────────────────────
//
// This counts dependents. It cannot know whether a redraft is GOOD, and it
// deliberately does not gate anything: the point is to put the number in front
// of a person before they press the button, the same way linkGaps puts a
// missing ticket URL in front of one. A checker that blocks on a count is a
// checker that gets switched off.
import { samePlaceName } from "./danishNames";
import { placeSlug } from "./placeUrl";
import { townOfLocation } from "./nightlife";

const clean = (v) => String(v == null ? "" : v).trim();

// ── WHAT CURRENTLY HANGS OFF THIS TOWN ──────────────────────────────
//
// Pools are injected rather than imported, for the reason costLedger's rowFor
// is: the suite can hand this four rows instead of standing up the published
// set, and this file cannot quietly start deciding WHICH places exist.
export const townDependents = (town, { venues = [], streets = [], townPages = [], entries = [] } = {}) => {
  const name = clean(town);
  if (!name) return null;
  const matches = (other) => !!other && samePlaceName(clean(other), name);
  const inTown = (row) => matches(townOfLocation(row?.location)) || matches(row?.town);
  return {
    town: name,
    slug: placeSlug(name),
    venues: (venues || []).filter(inTown).map(v => v.name).filter(Boolean),
    streets: (streets || []).filter(inTown).map(s => s.name).filter(Boolean),
    hasScenePage: (townPages || []).some(p => matches(p?.name)),
    // A district that says it is inside this town, and somewhere that says you
    // sleep here. Both are stored as the town's NAME on the OTHER row, so both
    // detach the moment this row is renamed and nothing anywhere reports it.
    partOf: (entries || []).filter(e => matches(e?.partOf)).map(e => e.name).filter(Boolean),
    dayTripFrom: (entries || []).filter(e => matches(e?.dayTripFrom)).map(e => e.name).filter(Boolean),
  };
};

export const dependentCount = (dep) =>
  !dep ? 0 : dep.venues.length + dep.streets.length + dep.partOf.length + dep.dayTripFrom.length + (dep.hasScenePage ? 1 : 0);

// ── THE TWO FIELDS THAT CARRY THE RISK ──────────────────────────────
//
// Named here rather than left implicit, because "be careful" is not a check.
// Everything not on this list is prose, and prose is what a redraft is FOR.
export const LOAD_BEARING = ["name", "lat", "lon"];

// ── WHAT WOULD ACTUALLY BREAK, GIVEN A PROPOSED REDRAFT ─────────────
//
// `before` is the live row, `after` is what the redraft wants to publish. The
// comparison is deliberately narrow: it reports the two things that detach
// relationships and moves a URL, and it says nothing at all about the prose,
// which nobody should be warned about changing.
export const redraftRisks = (before, after, dep = null) => {
  const a = before || {}, b = after || {};
  const out = [];
  const nameA = clean(a.name), nameB = clean(b.name);
  if (nameA && nameB && nameA !== nameB) {
    // samePlaceName is what every relationship is matched through, so a rename
    // it still recognises is a rename nothing detaches on. "København" to
    // "Copenhagen" is safe; "Copenhagen" to "Copenhagen (Zealand)" is not.
    const stillMatches = samePlaceName(nameA, nameB);
    const n = dependentCount(dep);
    out.push(stillMatches
      ? `The name changed from "${nameA}" to "${nameB}", and samePlaceName still reads them as one place, so nothing detaches. The URL DOES move: /denmark/${placeSlug(nameA)} becomes /denmark/${placeSlug(nameB)}, and the old address stops resolving.`
      : `THE NAME CHANGED from "${nameA}" to "${nameB}" and they do not match as one place. ${n ? `${n} thing${n === 1 ? "" : "s"} currently attached to this town` : "Anything attached to this town"} detach${n === 1 ? "es" : ""} silently, because every relationship here is matched by name at render time. The URL moves too: /denmark/${placeSlug(nameA)} stops resolving.`);
  }
  const moved = ["lat", "lon"].some(k => {
    const x = Number(a[k]), y = Number(b[k]);
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) > 0.001;
  });
  if (moved) {
    out.push(`THE COORDINATE MOVED. The region filter is derived from it, so is the map pin, and so is every distance calculated against this town. coordCheck's publish gate will catch a wild one; a small wrong move is exactly what it cannot see.`);
  }
  return out;
};

// ── THE LINE A FOUNDER READS BEFORE PRESSING THE BUTTON ─────────────
export const redraftBrief = (dep) => {
  if (!dep) return "";
  const n = dependentCount(dep);
  if (!n) return `Nothing else currently points at ${dep.town}. A redraft here reaches no other entry, so the only thing to keep is the spelling of the name, because /denmark/${dep.slug} is built from it.`;
  const bits = [];
  if (dep.venues.length) bits.push(`${dep.venues.length} nightlife venue${dep.venues.length === 1 ? "" : "s"}`);
  if (dep.streets.length) bits.push(`${dep.streets.length} bar street${dep.streets.length === 1 ? "" : "s"}`);
  if (dep.hasScenePage) bits.push("a published scene guide");
  if (dep.partOf.length) bits.push(`${dep.partOf.length} place${dep.partOf.length === 1 ? "" : "s"} that sit inside it (${dep.partOf.slice(0, 4).join(", ")}${dep.partOf.length > 4 ? "…" : ""})`);
  if (dep.dayTripFrom.length) bits.push(`${dep.dayTripFrom.length} place${dep.dayTripFrom.length === 1 ? "" : "s"} you visit from it (${dep.dayTripFrom.slice(0, 4).join(", ")}${dep.dayTripFrom.length > 4 ? "…" : ""})`);
  return `${n} thing${n === 1 ? "" : "s"} currently attach${n === 1 ? "es" : ""} to ${dep.town}: ${bits.join(", ")}. Every one of them is matched BY NAME at render time, not by an id, so they survive any amount of rewriting and detach the instant the name changes. Keep "${dep.town}" spelled exactly as it is, keep the coordinate, and rewrite everything else freely.`;
};
