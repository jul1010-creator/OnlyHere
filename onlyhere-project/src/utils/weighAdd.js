// ── SAYING YES AND SAYING WHY IT MIGHT BE A BAD IDEA ────────────────
//
// Oliver, 13 Sep 2026, on the assist beside the preview: "It doesn't add
// anything. Also, is it possible for the AI to calculate if such a decision
// might not be wise? Example: 'I can add Aalborg Zoo. However, you might want to
// reconsider whether you will have the time.'"
//
// Yes, and the whole point of this file is that the app works it out rather than
// the model. Asking a model to decide whether a plan is too full produces a
// sentence that sounds like arithmetic and sometimes is not, and every bug
// Oliver has reported this week is a number nobody checked.
//
// WHAT IS COUNTABLE HERE IS COUNTED. What is not, is not claimed:
//
//   COUNTED   how many stops the trip already holds against how many days it
//             has, how many of them already carry this place's own theme,
//             whether its town is one the trip already goes to.
//   QUOTED    whether the row says it costs money, in the row's own words, and
//             how many people are coming. The multiplication is NOT done here.
//             "249 for adults and 149 per child" times nine is a sum this file
//             would have to parse two numbers and a currency out of prose to
//             attempt, and a wrong total stated confidently is worse than no
//             total. The model quotes the line; the traveller multiplies.
//   NEVER     whether the place is worth it, whether they will enjoy it, or how
//             long they will want to stay. Nobody has that.
//
// The result is a list of plain facts. The chat prompt turns them into a
// sentence, the chip under the reply shows the shortest of them, and neither one
// invents a reason the traveller cannot check.

import { themesOf, THEME_LABEL } from "./placeThemes";
import { entryPrice } from "./entryPrice";
import { fold } from "./danishNames";

// ── HOW MUCH A DAY HOLDS ────────────────────────────────────────────
//
// Three real stops. Not a fact about the world and not pretending to be one: it
// is the shape this app plans to, the same kind of number as the ceiling on bars
// in a night, and it is written down once here so the sentence a traveller reads
// and the gate that produced it cannot disagree.
//
// It is deliberately generous. Four museums in a day is possible and miserable,
// and a gate that fires at the miserable end would fire on every trip. This one
// fires when the plan has stopped being a plan.
export const STOPS_A_DAY = 3;

const nameOf = (p) => String(p?.name || "").trim();
const townOf = (p) => String(p?.town || p?.city || p?.location || "").trim();

// The theme a place is mostly about. The first of its own tags, because the
// publishing sweep writes the primary one first, and an empty string where a row
// carries none rather than a guess at one.
export const mainTheme = (place) => themesOf(place)[0] || "";

// ── THE OBJECTIONS, IN THE ORDER THEY MATTER ────────────────────────
//
// `already` is every place the trip currently holds, picked or planned. `days`
// is the brief's number and null when nobody has said. `townsOnRoute` is the
// towns the trip already visits.
//
// Returns [] when there is nothing to object to, which is the common case and
// the one worth protecting: a gate that always has something to say is a gate
// nobody reads.
export const weighAdd = (place, { days = null, partySize = null, already = [], townsOnRoute = [] } = {}) => {
  if (!place || !nameOf(place)) return [];
  const notes = [];
  const held = (Array.isArray(already) ? already : []).filter(p => nameOf(p) && fold(nameOf(p)) !== fold(nameOf(place)));

  // ── IS THERE ROOM ───────────────────────────────────────────────
  // Only where the length is known. With no day count this says nothing at all,
  // rather than guessing at a trip that might be a fortnight.
  if (Number.isFinite(days) && days > 0) {
    const room = days * STOPS_A_DAY;
    const after = held.length + 1;
    if (after > room) {
      notes.push({
        kind: "time",
        text: `This would be stop ${after} across ${days} day${days === 1 ? "" : "s"}, which is more than ${room > 0 ? `the ${room} that fit` : "fits"} at a sensible pace.`,
        short: `that is ${after} stops in ${days} day${days === 1 ? "" : "s"}`,
      });
    }
  }

  // ── HAVE THEY DONE THIS ALREADY ─────────────────────────────────
  // Counted by the place's own theme tag, so "three theme parks" is a count of
  // rows and not an impression of the week.
  const theme = mainTheme(place);
  if (theme) {
    const same = held.filter(p => themesOf(p).includes(theme));
    if (same.length >= 2) {
      const label = String(THEME_LABEL[theme] || theme).toLowerCase();
      notes.push({
        kind: "repeat",
        text: `The trip already holds ${same.length} ${label} stops: ${same.slice(0, 3).map(nameOf).join(", ")}.`,
        short: `the week already has ${same.length} ${label} stops`,
      });
    }
  }

  // ── IS IT EVEN ON THE WAY ───────────────────────────────────────
  // A town nobody has mentioned is a detour, and the traveller is the only one
  // who knows whether it is worth one.
  const town = townOf(place);
  const route = (Array.isArray(townsOnRoute) ? townsOnRoute : []).map(t => fold(String(t || ""))).filter(Boolean);
  if (town && route.length && !route.includes(fold(town))) {
    notes.push({
      kind: "route",
      text: `${town} is not one of the towns this trip already goes to.`,
      short: `${town} is off the route as it stands`,
    });
  }

  // ── AND IT IS NOT FREE ──────────────────────────────────────────
  // The row's own words, never a sum. Raised only for a group, because one
  // entrance ticket is not a decision and nine of them is.
  const price = entryPrice(place);
  if (price && price.free === false && Number.isFinite(partySize) && partySize >= 4) {
    notes.push({
      kind: "cost",
      text: `Entry is not free here and there are ${partySize} of them, so the ticket line is worth reading before they commit: ${String(price.says || "").trim()}`,
      short: `it is not free, and there are ${partySize} of you`,
    });
  }
  return notes;
};

// ── THE ONE LINE THAT FITS UNDER A CHIP ─────────────────────────────
// The first objection, because they are already in the order that matters and a
// chip with three clauses on it is a paragraph wearing a button.
export const addCaution = (notes) => {
  const list = Array.isArray(notes) ? notes : [];
  return list.length ? String(list[0].short || "").trim() : "";
};

// ── AND WHY THERE IS NO PER-PLACE BLOCK FOR THE MODEL ───────
//
// One was written and thrown away the same hour. It handed the model the
// objections for a NAMED place, which cannot work: the model names the place in
// the reply it is composing, so there is nothing to hand it beforehand. The
// counting reaches it through tripLoadBlock below instead, as facts about the
// trip rather than about a candidate, and the per-place version survives only as
// the caution under the chip, which is computed after the reply exists.

// ── WHAT THE TRIP WEIGHS, EVERY TURN ─────────────────────
//
// The per-place version above can only run once a place has been named, and the
// model names it in the same breath as offering it. So the counting arrives
// BEFORE the reply instead: here is what the trip currently holds, and the rule
// is to weigh anything you offer against it.
//
// Facts only. Every number in here is a length the traveller gave or a count of
// rows, and the block says so, because a model handed a number tends to do
// arithmetic on it and this one has nothing to add up.
export const tripLoadBlock = ({ days = null, partySize = null, already = [], townsOnRoute = [] } = {}) => {
  const held = (Array.isArray(already) ? already : []).filter(p => nameOf(p));
  if (!held.length && !Number.isFinite(days)) return "";
  const lines = ["WHAT THIS TRIP ALREADY HOLDS, COUNTED BY THE APP. These are facts about their plan, not a suggestion:"];
  if (Number.isFinite(days) && days > 0) {
    lines.push(`  ${held.length} stop${held.length === 1 ? "" : "s"} across ${days} day${days === 1 ? "" : "s"}. About ${STOPS_A_DAY} a day is a pace somebody can keep, so there is room for roughly ${days * STOPS_A_DAY}.`);
  } else if (held.length) {
    lines.push(`  ${held.length} stop${held.length === 1 ? "" : "s"}, and nobody has said how many days.`);
  }
  const byTheme = new Map();
  held.forEach(p => { const t = mainTheme(p); if (t) byTheme.set(t, (byTheme.get(t) || 0) + 1); });
  const repeats = [...byTheme.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
  if (repeats.length) {
    lines.push(`  Already covered more than once: ${repeats.map(([t, n]) => `${String(THEME_LABEL[t] || t).toLowerCase()} x${n}`).join(", ")}.`);
  }
  const towns = [...new Set((Array.isArray(townsOnRoute) ? townsOnRoute : []).map(t => String(t || "").trim()).filter(Boolean))];
  if (towns.length) lines.push(`  Towns on the route: ${towns.join(", ")}.`);
  if (Number.isFinite(partySize) && partySize >= 4) {
    lines.push(`  ${partySize} people are coming, so a per-head entry price is that number times ${partySize}. QUOTE the ticket line as the entry gives it and let them do the sum. Never state a total yourself.`);
  }
  lines.push("WHEN YOU OFFER TO ADD SOMETHING, WEIGH IT AGAINST THIS FIRST. Say the yes, then the one reservation that is true, then recommend. \"I can add it, though that would be your ninth stop in three days\" is the shape. Never invent a reservation to sound balanced, and never raise one that is not on this list.");
  return lines.join("\n");
};
