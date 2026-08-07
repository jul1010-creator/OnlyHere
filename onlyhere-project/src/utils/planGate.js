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

export const MIN_STOPS_MIDDLE_DAY = 2;
// Straight-line, so this is deliberately generous: real roads are longer, and a
// ferry makes the gap between the number and the day even bigger. 120 km as the
// crow flies is already most of a day once you have parked, waited and walked.
export const MAX_DAY_KM = 120;

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
  const problems = [];
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
    if (measured > 0 && measured === chain.length - 1 && km > MAX_DAY_KM) {
      problems.push({
        code: "TOO_MUCH_TRAVEL", day: dayNo,
        detail: `Day ${dayNo} covers about ${Math.round(km)} km in a straight line, which is most of the day in transit before you have parked or waited for anything. Break it up or move a stop.`,
      });
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
    stats: { days: list.length, stops: allStops.length, distinct: distinct.size, matched },
  };
};

// Turned into something a planner can act on. Deliberately plain and specific:
// "fix the plan" produces a different plan, "day 2 has one stop" produces a
// second stop on day 2.
export const planProblemsForPrompt = (problems) =>
  problems.map(p => `- ${p.detail}`).join("\n");
