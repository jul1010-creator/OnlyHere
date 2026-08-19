// ── THE PLAN GATE ───────────────────────────────────────────────────
// Oliver, 7 Aug 2026, after reading a guide the pipeline had produced and
// asking how to fix it. His choice of where to start, and the right one.
//
// THE PROBLEM THIS EXISTS FOR. The planner's day/stop skeleton went straight to
// the writer with nothing in between. The writer is good, so a weak plan came
// back reading like a considered one, and the flaws only showed up to a human
// who counted. His real guide: three days, three actual places, one of them
// counted twice, a middle day that was a quarry plus three and three quarter
// hours of moving, and a "Keep in mind" paragraph that apologised for the
// itinerary ("this is a genuine cross-country trip, not a loop"). The system was
// warning him about a plan it had just made. It should not have made it.
//
// So this runs on the SKELETON, before a single sentence is written, and every
// rule here is something a computer can check without an opinion: how many
// distinct places, how many stops on a day, whether a place is counted twice,
// how far the day actually moves. No model is asked whether the plan is good.
//
// WHAT A FAILURE MEANS. Not a refusal. The plan goes back once with the
// problems named, and whatever comes back is used. A traveler waiting for a
// guide must never be handed an error because their trip is awkward, and some
// trips genuinely are: a one-way transfer day across the country is a real
// thing people do. One retry turns "the planner did not think about it" into
// "the planner thought about it and it is still like this", which is the honest
// difference. Anything still failing after that is recorded on the guide so
// Studio can see it, rather than quietly disappearing.

import { haversineKm } from "./helpers";
import { MODE_DAY_KM, travelModeKey } from "./routeOrder";

export const MIN_STOPS_MIDDLE_DAY = 2;

// ── AND THE ARRIVAL DAY HAS A CEILING, NOT A FLOOR ──────────────────
//
// Oliver, 17 Aug 2026, reading a seven day guide that opened with a 09:00 landing
// at Kastrup: "And Comic Con at the second you reach Copenhagen? Sounds like a
// wild plan. You need to make first day be a relaxing day."
//
// Every rule in this file until now was a MINIMUM. The edge days were exempted
// from the minimum, which is right, and nothing anywhere said they should be
// lighter. So the planner filled day one exactly as hard as a Wednesday: land,
// clear passport control and baggage, cross the city, check in, and then a full
// programme, on the day with the least energy and the most that can go wrong.
//
// TWO, not one, and the arrival day only. One would be a rule about how little a
// day may hold, which is the opposite mistake and would make a 06:00 arrival
// waste a whole day. Two things after a flight is a real afternoon.
//
// The departure day is deliberately NOT capped: leaving at 21:00 is a full free
// day, and how much of it is usable is a question about the flight, which the
// plan does not know.
export const MAX_STOPS_ARRIVAL_DAY = 2;
// Straight-line, so this is deliberately generous: real roads are longer, and a
// ferry makes the gap between the number and the day even bigger. 120 km as the
// crow flies is already most of a day once you have parked, waited and walked.
//
// ── AND IT IS ONLY THE FALLBACK NOW, BECAUSE 120 KM IS NOT ONE NUMBER ──
// Oliver, 19 Aug 2026, with a preview on his phone: three days, parents in their
// sixties, "we want to cycle where it makes sense", "budget is not really the
// constraint, time is" — and the towns reading 9 km, 222 km, 101 km, 129 km. Four
// hundred and fifty kilometres of hops in three days, under a summary paragraph
// promising "an easy pace between hotels without wasting your limited time".
//
// This gate has had a distance rule since 12 Aug and it is a FLAT 120 KM, the same
// number whatever the traveller said they were travelling by. routeOrder.js has
// carried MODE_DAY_KM for days: walk 15, bike 60, transit 250, car 300. So the gate
// was wrong in both directions at once —
//
//   on a bike trip   a 100 km day PASSES at 120 while the real ceiling is 60
//   on a car trip    a 150 km day FAILS at 120 while the real ceiling is 300
//
// and the planner was made to retry perfectly normal driving days while waving
// through days nobody could ride. The right table already existed, in the file
// next door, which is the third time in one night that this codebase has paid for
// keeping one decision in two places.
//
// 120 stays for the case it was actually written for: no mode stated at all. It is
// roughly transit-and-car shaped, which is what an unstated mode most often turns
// out to be, and it is a number rather than a refusal to judge.
export const MAX_DAY_KM = 120;

// How far a day may move, by the mode the traveller actually named. One table,
// owned by routeOrder, read here.
export const dayCeilingKm = (mode) => {
  const key = mode ? travelModeKey(mode) : null;
  const perMode = key ? MODE_DAY_KM[key] : null;
  return Number.isFinite(perMode) ? perMode : MAX_DAY_KM;
};

const norm = (s) => String(s || "").trim().toLowerCase();

// ── Does the title promise something the trip does not contain? ─────
// "Cobbled Streets and Chalk Cliffs" led a guide with no cliff anywhere in it:
// Faxe Kalkbrud is a quarry, and Stevns Klint, the actual chalk cliff twenty
// minutes away, was not in the itinerary. A title is the first factual claim a
// reader meets.
//
// DELIBERATELY NARROW. Only concrete features that make a checkable promise are
// listed. Colour and mood ("slow", "quiet", "cobbled") are not the title's job
// to justify and are not checked, because a rule that flags them would be wrong
// far more often than right. Danish and English both, since stop names are
// Danish and titles are English.
// EVERY TOKEN HERE IS MATCHED AS A SUBSTRING, so a short one is a trap. The
// first draft listed "ø" for island and "borg" for castle: "ø" appears in
// Køge, Møgeltønder and half the Danish map, and "borg" is inside Aalborg and
// Nyborg, which are towns and not castles. "have" was worse still, since it is
// also an ordinary English word. Each of those would have quietly marked a
// promise as delivered when it was not, which is the failure this check exists
// to prevent. Islands are listed by name instead, because "is this place an
// island" has a finite, knowable answer in a country this size.
const DK_ISLANDS = ["ærø", "samsø", "fanø", "møn", "bornholm", "langeland", "læsø",
  "als", "falster", "lolland", "fyn", "funen", "endelave", "anholt", "tunø", "orø",
  "livø", "fur", "avernakø", "lyø", "strynø", "drejø", "hjarnø", "venø", "agersø"];

// CLAIM AND DELIVERY ARE NOT THE SAME LIST, which the tests caught immediately.
// "Castles of Funen" was flagged for promising islands, because Funen is one.
// It is not promising islands: it is naming the region the castles are in. A
// specific place name in a title is a place, not a feature promise, so island
// names count only on the DELIVERY side. Getting this backwards produces false
// alarms, and a checker that cries wolf about titles gets switched off.
export const FEATURE_WORDS = {
  cliff: { claim: ["klint", "cliff", "cliffs"] },
  castle: { claim: ["slot", "borgen", "castle", "palace", "palæ", "herregård"] },
  cathedral: { claim: ["domkirke", "cathedral", "katedral"] },
  church: { claim: ["kirke", "church", "kloster", "abbey", "monastery"] },
  beach: { claim: ["strand", "beach", "beaches", "dune", "klit"] },
  island: { claim: ["island", "islands", "øen", "øer"], deliver: ["island", "islands", "øen", "øer", ...DK_ISLANDS] },
  ferry: { claim: ["færge", "ferry", "harbour", "harbor"], deliver: ["færge", "ferry", "harbour", "harbor", "havn"] },
  viking: { claim: ["viking", "vikinge"] },
  museum: { claim: ["museum", "museet", "gallery", "kunst"] },
  festival: { claim: ["festival", "festuge", "concert"] },
  lighthouse: { claim: ["fyret", "lighthouse"] },
  forest: { claim: ["skov", "forest", "woods"] },
  lake: { claim: ["søen", "lake", "lakes"] },
  garden: { claim: ["haven", "garden", "gardens", "botanisk"] },
};

// A feature counts as delivered if any stop or town name carries one of its
// words. Substring matching is fine at these lengths, and "cliffs" has to match
// "cliff", but see DK_ISLANDS above for what happens when a token is too short.
export const titlePromises = (title, stopNames = [], townNames = []) => {
  const t = norm(title);
  const haystack = [...(stopNames || []), ...(townNames || [])].map(norm).join(" | ");
  const missing = [];
  for (const [feature, words] of Object.entries(FEATURE_WORDS)) {
    if (!words.claim.some(w => t.includes(w))) continue;
    const deliver = words.deliver || words.claim;
    // A title naming the very thing it promises delivers it: "Nyborg Slot" in
    // the title AND on the itinerary is one castle, not a broken promise.
    if (!deliver.some(w => haystack.includes(w))) missing.push(feature);
  }
  return missing;
};

// ── The gate itself ─────────────────────────────────────────────────
// `coords` is optional: a map of stop name to {lat, lon}. Without it the
// distance rule simply does not run, rather than guessing. Never conclude a
// fact from a missing lookup.
export const checkPlan = (days, coords = {}, opts = {}) => {
  // opts.mode is the traveller's own words ("bike", "we are renting a car", a chip
  // label) and is folded by travelModeKey. Absent, the flat fallback applies and
  // the trip is still judged rather than waved through.
  const ceilingKm = dayCeilingKm(opts.mode);
  const problems = [];
  const unjudged = [];
  const list = Array.isArray(days) ? days : [];
  if (list.length === 0) return { ok: false, problems: [{ code: "NO_DAYS", detail: "The plan has no days in it." }] };

  const allStops = list.flatMap((d, i) => (d.stops || []).filter(s => s && s.name).map(s => ({ ...s, _day: d.day || i + 1 })));
  const distinct = new Set(allStops.map(s => norm(s.name)));

  // 1. AN EMPTY DAY IS NOT A DAY.
  list.forEach((d, i) => {
    const n = (d.stops || []).filter(s => s && s.name).length;
    const dayNo = d.day || i + 1;
    if (n === 0) {
      problems.push({ code: "EMPTY_DAY", day: dayNo, detail: `Day ${dayNo} has no stops at all.` });
      return;
    }
    // A first or last day can legitimately hold one thing: you land at two in
    // the afternoon, or you leave at eleven. A day in the MIDDLE with one stop
    // is a day the planner did not fill.
    const isEdge = i === 0 || i === list.length - 1;
    if (!isEdge && n < MIN_STOPS_MIDDLE_DAY) {
      problems.push({ code: "THIN_DAY", day: dayNo, detail: `Day ${dayNo} has only ${n} stop. A day in the middle of a trip needs at least ${MIN_STOPS_MIDDLE_DAY}.` });
    }
    // The arrival day, and only when the trip is long enough to have somewhere
    // else to put things. On a two day trip, cutting day one is cutting the trip.
    if (i === 0 && list.length >= 3 && n > MAX_STOPS_ARRIVAL_DAY) {
      problems.push({
        code: "CROWDED_ARRIVAL",
        day: dayNo,
        detail: `Day ${dayNo} is the arrival day and holds ${n} stops. Keep at most ${MAX_STOPS_ARRIVAL_DAY}: they land, get through the airport, cross the city and check in before any of this. Move the rest to a later day.`,
      });
    }
  });

  // 2. A PLACE YOU SLEEP IN IS A BASE, NOT A SECOND STOP.
  // Ærøskøbing was Day 2's evening arrival and Day 3's whole morning, so the
  // guide counted four stops and delivered three places, and drew a travel chip
  // for a journey from a town to itself.
  const dayByPlace = new Map();
  allStops.forEach(s => {
    const k = norm(s.name);
    if (!dayByPlace.has(k)) dayByPlace.set(k, new Set());
    dayByPlace.get(k).add(s._day);
  });
  for (const [place, dayset] of dayByPlace) {
    if (dayset.size > 1) {
      const shown = allStops.find(s => norm(s.name) === place)?.name || place;
      problems.push({
        code: "REPEATED_STOP", detail: `"${shown}" is a stop on days ${[...dayset].join(" and ")}. Somewhere you stay is a base, not a stop on two days: give the second day its own places in that town.`,
      });
    }
  }

  // 3. THIN OVERALL. Three days and three places is a short trip written long.
  // One more place than days is a low bar on purpose: this is meant to catch a
  // plan nobody would call finished, not to impose a pace.
  if (distinct.size < list.length + 1) {
    problems.push({
      code: "TOO_FEW_PLACES",
      detail: `${list.length} days but only ${distinct.size} different places. Aim for at least ${list.length + 1}.`,
    });
  }

  // 4. HOW FAR THE DAY ACTUALLY MOVES.
  // "How long the transport is" is the thing Oliver says visitors have no way
  // to judge for themselves, and a day that is mostly a car is a day the trip
  // did not really have.
  list.forEach((d, i) => {
    const stops = (d.stops || []).filter(s => s && s.name);
    const dayNo = d.day || i + 1;
    let km = 0, measured = 0;
    const prevLast = i > 0 ? (list[i - 1].stops || []).filter(s => s && s.name).slice(-1)[0] : null;
    const chain = prevLast ? [prevLast, ...stops] : stops;
    for (let j = 0; j < chain.length - 1; j++) {
      const a = coords[chain[j].name], b = coords[chain[j + 1].name];
      if (!a || !b) continue;                       // unmeasured, so unjudged
      if (norm(chain[j].name) === norm(chain[j + 1].name)) continue;
      km += haversineKm(a, b) || 0;
      measured++;
    }
    // Only speak when every leg of the day was measurable. A total built from
    // the legs that happened to resolve understates the day, and understating
    // is exactly the direction that lets a bad plan through.
    const legs = chain.length - 1;
    const fullyMeasured = legs > 0 && measured === legs;
    if (fullyMeasured && km > ceilingKm) {
      problems.push({
        code: "TOO_MUCH_TRAVEL", day: dayNo,
        // The ceiling is named, because "too much" without a number is the kind of
        // instruction a planner satisfies by moving one stop and changing nothing.
        detail: `Day ${dayNo} covers about ${Math.round(km)} km in a straight line${opts.mode ? ` by ${opts.mode}` : ""}, over the ${ceilingKm} km a day can hold that way, and that is before you have parked or waited for anything. Break it up or move a stop.`,
      });
    }
    // ── AND "WE COULD NOT CHECK" MUST NOT LOOK LIKE "WE CHECKED" ────
    // The comment above is right that a partial total understates the day, so the
    // rule correctly stays silent. What it did NOT do is say it stayed silent, and
    // an unjudged day came out of this function looking exactly like a day that
    // passed. On the whole product whose promise is that nothing is asserted that
    // nobody measured, that is the wrong silence.
    //
    // Never a blocking problem: the planner cannot fix a coordinate Gemlyx does not
    // hold, and asking it to would produce an invented town. It is recorded so it
    // is countable, and so "3 days, all judged" and "3 days, none judged" stop
    // reading the same.
    if (legs > 0 && !fullyMeasured) {
      unjudged.push({ day: dayNo, legs, measured });
    }
  });

  // 5. SOFT SIGNAL, never a failure: how much of this trip is places Gemlyx
  // actually knows. A stop that matches a published entry brings a photo, a
  // link and facts that were checked; one that does not brings none of those.
  // Reported so it can be seen, not enforced, because a genuinely good stop
  // Gemlyx has not covered yet is a gap in the guide, not a flaw in the plan.
  const matched = typeof opts.isPublished === "function"
    ? allStops.filter(s => opts.isPublished(s.name)).length
    : null;

  return {
    ok: problems.length === 0,
    problems,
    // The days whose distance could not be judged, and how much of each resolved.
    // A caller that wants to surface "two of three days went unchecked" has the
    // numbers; nothing here forces it to.
    unjudged,
    stats: {
      days: list.length, stops: allStops.length, distinct: distinct.size, matched,
      // Which ceiling was applied and why, so a run log can show that a 100 km day
      // passed because the mode was a car rather than because nobody looked.
      ceilingKm, mode: opts.mode || null,
      judgedDays: list.length - unjudged.length,
    },
  };
};

// Turned into something a planner can act on. Deliberately plain and specific:
// "fix the plan" produces a different plan, "day 2 has one stop" produces a
// second stop on day 2.
export const planProblemsForPrompt = (problems) =>
  problems.map(p => `- ${p.detail}`).join("\n");
