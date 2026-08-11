import { isFerryText } from "./helpers";
import { normaliseTicketStatus } from "./tickets";
// ── READING A GUIDE WHEN YOU HAVE NEVER BEEN TO DENMARK ─────────────
// Oliver, 7 Aug 2026, asking whether the guide would still be overwhelming to
// someone who has never been. It would, and not for the reason I had been
// fixing. What I had removed was VOLUME: six maps down to one, empty photo
// plates down to compact rows, half the scroll height. That was real, and it
// was the part you could see.
//
// What was left is that the page still assumed you could read it. Three things
// a Dane has for free and a first-time visitor does not:
//
//   1. WHAT ANY OF THESE PLACES ARE. Vikingeskibsmuseet, Roskilde Domkirke,
//      Faxe Kalkbrud, Ærøskøbing. To someone who has never seen Danish those
//      are four long unpronounceable strings that look identical, and you have
//      to read a paragraph before you know whether one is a museum, a town or
//      a hole in the ground. This turns out to be nearly free to fix, because
//      Danish place names are compound and say what they are: -museet, -kirke,
//      -havn, -slot, -bro, -strand. The name already carries the answer.
//
//   2. SCALE. "38 mins by train" means nothing without a frame. Denmark being
//      small is the single most useful fact a visitor does not have, and the
//      guide never said it.
//
//   3. WHAT KIND OF TRIP THIS IS. The summary strip answers how big and dodges
//      what shape. Three days, eight stops, three towns is a dashboard.
//
// EVERYTHING HERE IS COMPUTED FROM THE PLAN, never written by a model. A
// sentence a model produces to describe a trip is filler that reads as insight,
// which is the failure mode this whole project exists to avoid. Each function
// returns null rather than guessing when it does not know.

// ── WHAT KIND OF PLACE IS THIS ──────────────────────────────────────
// Ordered longest-first so "domkirke" is a cathedral before "kirke" makes it a
// church, and "gamle by" is an old town before "by" does anything.
//
// TOKENS ARE MATCHED WITH BOUNDARIES, not as bare substrings, which this
// project has now been bitten by twice in one day: "Vejlebrovej" resolved to
// Vejle, and "Aalborg" nearly counted as a castle because "borg" was in the
// list. Danish letters are not word characters to a regex \b, so the check
// looks at the characters either side for being letters in any alphabet.
const isLetter = (ch) => !!ch && /\p{L}/u.test(ch);
const hasToken = (name, token) => {
  const n = String(name || "").toLowerCase(), t = token.toLowerCase();
  let from = 0;
  for (;;) {
    const i = n.indexOf(t, from);
    if (i < 0) return false;
    // A Danish compound glues the noun onto the end of the word, so a letter
    // BEFORE the token is normal ("Vikingeskibsmuseet") and a letter after it
    // is not ("Storebæltsbroen" ends the word; "Broager" does not mean bridge).
    if (!isLetter(n[i + t.length])) return true;
    from = i + 1;
  }
};

export const STOP_KINDS = [
  ["gamle by", "Old town"],
  ["domkirke", "Cathedral"],
  ["katedral", "Cathedral"],
  ["kalkbrud", "Chalk quarry"],
  ["rundkirke", "Round church"],
  ["vikingeskibsmuseet", "Viking ship museum"],
  ["museet", "Museum"], ["museum", "Museum"],
  ["akvarium", "Aquarium"],
  ["festuge", "Festival"], ["festival", "Festival"],
  ["kloster", "Abbey"],
  ["kirke", "Church"],
  ["slottet", "Castle"], ["slot", "Castle"], ["palæ", "Palace"],
  ["færgehavn", "Ferry port"], ["lufthavn", "Airport"],
  ["havnen", "Harbour"], ["havn", "Harbour"],
  ["banegård", "Station"], ["station", "Station"],
  ["broen", "Bridge"], ["bro", "Bridge"],
  ["stranden", "Beach"], ["strand", "Beach"],
  ["camping", "Campsite"],
  ["fyret", "Lighthouse"], ["fyr", "Lighthouse"],
  ["klint", "Cliffs"],
  ["skoven", "Forest"], ["skov", "Forest"],
  ["haven", "Gardens"],
  ["torvet", "Square"], ["torv", "Square"],
  ["gade", "Street"],
  ["søen", "Lake"],
  ["park", "Park"],
  ["zoo", "Zoo"],
  ["tårnet", "Tower"], ["tårn", "Tower"],
  ["herregård", "Manor house"],
  ["vold", "Ramparts"],
  ["mølle", "Mill"],
];

// What a published entry's own category is worth saying, when the name itself
// gives nothing away. Deliberately concrete words: "Attraction" tells a visitor
// nothing they did not already assume.
const BY_SOURCE = { town: "Town", free: "Free to enter", food: "Restaurant", nightlife: "Bar", event: "Event", craft: "Workshop" };

export const stopKind = (name, real) => {
  for (const [token, label] of STOP_KINDS) {
    if (hasToken(name, token)) return label;
  }
  const src = real && real._src;
  return (src && BY_SOURCE[src]) || null;
};

// ── HOW BIG IS DENMARK, ACTUALLY ────────────────────────────────────
// Built from the longest journey the Directions API actually measured, so it
// says nothing at all when the legs were not all measurable. A confident line
// about scale, built from the legs that happened to resolve, would understate
// the trip in exactly the direction that misleads.
export const tripScaleLine = (shape) => {
  const m = shape && shape.longest && shape.longest.minutes;
  if (typeof m !== "number" || m <= 0) return null;
  if (m <= 75) return `Denmark is small. The longest single journey in this trip is ${shape.longest.text}.`;
  if (m <= 150) return `The longest single journey here is ${shape.longest.text}, which for Denmark is a proper haul rather than a hop.`;
  return `One journey here takes ${shape.longest.text}. That is most of a day, so plan around it rather than through it.`;
};

// ── WHAT SHAPE OF TRIP IS THIS ──────────────────────────────────────
// One sentence, assembled from things that are true by counting: how many
// towns, how often you change hotel, and how you are getting around. Never a
// model's impression of the trip.
export const tripCharacter = (guide, shape) => {
  // ── THIS SENTENCE HAS NEVER ONCE APPEARED ON A GUIDE ──────────────
  // The guard read `shape.days`. tripShape (pages/GuidePage.jsx) returns
  // { dayCount, stopCount, towns, km, minutes, longest } and has no `days` key
  // at all, so this returned null on every guide ever rendered. Its only
  // production caller is GuidePage line 717, which passes exactly that object.
  //
  // The reason it survived: three tests build the shape BY HAND as
  // { days: 3, towns: [...] } and assert on the returned sentence. All three
  // were green while the feature was dead, which is this codebase's most
  // repeated failure (one thing described in two places, and the test read the
  // copy that was not the one production uses) in its purest form. The tests
  // now pass the real tripShape output.
  //
  // Guarded on what it actually reads: `towns` off the shape, and days off the
  // GUIDE. Not on a key nothing produces.
  if (!shape || !guide) return null;
  const towns = shape.towns || [];
  const parts = [];

  // How many bases, counted from where each day ENDS rather than from how many
  // towns are touched: a day trip out and back is not a change of base.
  const days = (guide && guide.days) || [];
  const lastTownOf = (d) => {
    const stops = (d.stops || []).filter(s => s && (s.town || s.name));
    const last = stops[stops.length - 1];
    return last ? String(last.town || last.name).trim().toLowerCase() : null;
  };
  const bases = [];
  days.forEach(d => {
    const t = lastTownOf(d);
    if (t && bases[bases.length - 1] !== t) bases.push(t);
  });
  const moves = Math.max(0, bases.length - 1);

  if (towns.length <= 1) parts.push("A trip that stays in one place");
  else if (moves === 0) parts.push(`One base, with ${towns.length - 1} ${towns.length - 1 === 1 ? "day" : "days"} out`);
  else if (moves === 1) parts.push("Two bases, split across the trip");
  else parts.push(`A moving trip: you change town ${moves} times`);

  // How, in the traveler's own terms rather than the API's.
  const mode = guide && guide._mode;
  const byMode = { "public transport": "all by train and bus", bike: "mostly by bike", car: "by car", walk: "on foot" };
  if (byMode[mode]) parts.push(byMode[mode]);

  // A ferry is worth naming on its own: it is the one leg that runs to a
  // timetable you cannot argue with, and a visitor will not expect it.
  const anyFerry = days.some(d => (d.glance?.legs || []).some(l => isFerryText(l?.how)));
  if (anyFerry) parts.push("with at least one ferry crossing");

  const s = parts.join(", ");
  return s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}.` : null;
};

// ── WHAT DO I ACTUALLY HAVE TO BOOK ─────────────────────────────────
// The real anxiety of a first trip abroad is not information, it is decisions.
// This lists only things the guide can genuinely stand up: a dated event that
// is already on sale, a ferry leg, and where you are sleeping. Everything else
// is deliberately absent, because a "book ahead" list that pads itself out is
// how a traveler learns to ignore it.
export const bookingActions = (guide, lookupRealPlace) => {
  const out = [];
  const days = (guide && guide.days) || [];
  const seen = new Set();

  days.forEach(d => {
    (d.stops || []).forEach(s => {
      if (!s?.name || seen.has(s.name)) return;
      const real = typeof lookupRealPlace === "function" ? lookupRealPlace(s.name) : null;
      if (!real) return;
      // A dated event with a real ticket status is the clearest case there is.
      if (real._src === "event" && real.date) {
        seen.add(s.name);
        // ── READ THROUGH THE VOCABULARY, NOT PAST IT ────────────────
        // This used to compare the raw field against two strings, so a row
        // storing "selling_fast" or "available" (both real, both written by
        // older publishes) fell through to the generic line, and the two new
        // statuses had nowhere to land. off_sale gets its own sentence on
        // purpose: Ticketmaster's "offsale" is not a sold-out confirmation, and
        // telling a reader it is talks them out of a trip that would have
        // worked. See utils/tickets.js.
        const st = normaliseTicketStatus(real.ticketStatus);
        out.push({
          what: s.name,
          why: st === "cancelled" ? "Listed as cancelled, so check the official site before building a day around it."
            : st === "sold_out" ? "Sold out on the official site, so this one is worth checking for returns rather than counting on."
            : st === "off_sale" ? "Tickets are not on sale at the moment, which can mean sold out, not open yet, or closed. Check the official site before you count on it."
            : st === "limited" ? "Tickets are limited. Book before you fly."
            : st === "free" ? "Free to get in, so nothing to book, but the date is fixed."
            : "Dated event, so book before you travel rather than at the gate.",
        });
      }
    });
    if ((d.glance?.legs || []).some(l => isFerryText(l?.how))) {
      const key = `ferry-${d.day}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ what: `The ferry on day ${d.day}`, why: "Danish island crossings run a handful of times a day and fill up in summer. Book the crossing, not just the bed." });
      }
    }
  });

  if (days.some(d => d.glance?.stayArea || d.glance?.recommendedStay)) {
    out.push({ what: "Somewhere to sleep", why: "Small Danish towns have very few rooms, and the good ones go first in summer." });
  }
  return out;
};
