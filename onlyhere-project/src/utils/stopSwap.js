// ── THE CHANGE BUTTON, AND WHY LAYLA'S IS THE WRONG ONE ─────────────
//
// Oliver on Layla's trip checklist, 25 Aug 2026: "It's quite robotic tbf..
// that's something I want ours to do better." And on the product as a whole:
// "it feels very overwhelming and just 'pay here and pay here'."
//
// Every planner has a Change button. What they do with it is the same thing:
// throw the stop away, ask a model for another one, and print whatever comes
// back. Three faults, and they compound.
//
// ONE: IT NEVER ASKS WHY. "Not this" and "not this KIND of thing" and "not this
// FAR" are three different requests, and a swap that cannot tell them apart
// replaces a cathedral with another cathedral for somebody who has had enough of
// cathedrals. The reason is the only information in the interaction and it is
// the part nobody collects.
//
// TWO: THE REPLACEMENT IS GENERATED. A regenerated stop is a fresh chance to
// invent a place, and hallucinations damage traveller trust significantly more
// than ordinary mistakes do — the finding this whole product is built around.
// Gemlyx has 148 published, researched, sourced rows with real coordinates. A
// replacement drawn from those is not a smaller version of a model swap. It is a
// different kind of answer, and it is one nobody else can give.
//
// THREE: IT ALWAYS SUCCEEDS. Layla's reviewers: "could not find a hotel nearby"
// becoming a hotel a hundred miles away. A swap that must return something
// returns something wrong, and the traveller finds out on the day. When nothing
// real fits the reason, the honest answer is to say so and leave the stop where
// it is. That answer has to be BUILT, because the tempting one is always
// available.
//
// ── AND THE FOURTH THING, WHICH IS THE CONSTRAINT ───────────────────
//
// A swap is where a guide that HONOURED the traveller's constraints quietly
// stops honouring them. They said no ferries; the replacement is on an island.
// They said not Aarhus; the nearest real alternative is in Aarhus. See
// constraintCheck.js: the audit exists, this is the moment it matters, and the
// gate is repairWorked's rule — a swap is only accepted if it did not break
// something that was previously fine.

const said = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// ── THE REASONS, WHICH ARE THE WHOLE INTERACTION ────────────────────
//
// Five, not a text box. A text box is what a product offers when it has not
// decided what to do with the answer, and it puts the work of guessing what the
// system can act on onto the person. Each of these changes the search.
//
// `label` is what the traveller presses. `effect` is what it does, in the same
// words, so the button and the behaviour cannot drift apart.
export const SWAP_REASONS = [
  {
    id: "kind",
    label: "Not our sort of thing",
    effect: "Looks for something of a different kind nearby, not another one of these.",
    // The strongest signal in the set: it rules out the whole category.
    sameKind: false,
    widen: 1,
  },
  {
    id: "far",
    label: "Too far out of the way",
    effect: "Looks closer to the rest of the day, and will not go further than this stop already is.",
    sameKind: null,
    widen: 0.5,
  },
  {
    id: "been",
    label: "We have already been",
    effect: "Finds something else and keeps this one off the list for the rest of the trip.",
    sameKind: null,
    widen: 1,
    remember: true,
  },
  {
    id: "closed",
    label: "It is shut when we are there",
    effect: "Finds an alternative and notes the closure, so it does not come back on another day.",
    sameKind: true,
    widen: 1.5,
    remember: true,
  },
  {
    id: "other",
    label: "Just show me something else",
    effect: "Looks for the same sort of place somewhere else nearby.",
    sameKind: true,
    widen: 1,
  },
];

export const reasonById = (id) => SWAP_REASONS.find(r => r.id === said(id)) || null;

// ── THE SEARCH ──────────────────────────────────────────────────────
//
// `nearby` is injected: nearbyPublished lives in utils/nearbyPlaces.js and this
// file has no business importing the map maths. Same reason constraintCheck
// takes modeOf and evidence takes its vocabulary.
//
// EVERYTHING RETURNED IS A PUBLISHED ROW. Nothing here can produce a place that
// does not exist, which is the entire argument for doing it this way.
export const swapCandidates = (stop, { reason, point, library, nearby, radiusKm = 4, excluded = [] } = {}) => {
  const r = typeof reason === "string" ? reasonById(reason) : reason;
  if (!r || !point || typeof nearby !== "function") return [];
  const gone = new Set([said(stop?.name).toLowerCase(), ...(excluded || []).map(x => said(x).toLowerCase())].filter(Boolean));
  let found = [];
  try {
    found = nearby(point, library, { maxKm: radiusKm * r.widen, limit: 24, exclude: said(stop?.name) }) || [];
  } catch { return []; }
  const kindOf = (x) => said(x?.kind).toLowerCase();
  const here = kindOf(stop?._kind ? { kind: stop._kind } : stop);
  return found
    .filter(c => !gone.has(said(c?.name).toLowerCase()))
    // sameKind null means the kind is not what they objected to, so it does not
    // filter. true means give me another of these; false means anything BUT.
    .filter(c => r.sameKind === null || !here || (r.sameKind ? kindOf(c) === here : kindOf(c) !== here))
    // "Too far" may not return something further away than what it replaced.
    // A swap that makes the stated problem worse is the failure this product
    // keeps finding in other people's: the request was read and then ignored.
    .filter(c => r.id !== "far" || !Number.isFinite(Number(stop?._km)) || Number(c.km) < Number(stop._km))
    .slice(0, 3);
};

// ── AND THE ANSWER, INCLUDING THE ONE NOBODY BUILDS ─────────────────
//
// Every branch is a sentence somebody reads. None of them is "No results."
export const swapAnswer = (stop, candidates, reason) => {
  const r = typeof reason === "string" ? reasonById(reason) : reason;
  const name = said(stop?.name) || "this stop";
  const list = (candidates || []).filter(Boolean);
  if (!r) return { ok: false, why: "Tell me what is wrong with it and I will look for something else." };
  if (!list.length) {
    // THE HONEST REFUSAL. It says what was looked for, what was not found, and
    // what it did instead — and what it did is nothing, which is why it has to
    // say it out loud.
    const scope = r.id === "far" ? "closer in" : r.sameKind === false ? "of a different sort nearby" : "nearby";
    return {
      ok: false,
      why: `I have nothing ${scope} that I have actually researched, so I am leaving ${name} where it is rather than putting in somewhere I cannot vouch for. Take it out and I will rebuild the day around what is left.`,
    };
  }
  return {
    ok: true,
    why: list.length === 1
      ? `One I can vouch for: ${said(list[0].name)}.`
      : `${list.length} I can vouch for, nearest first.`,
    candidates: list,
  };
};

// ── THE LINE UNDER EACH CANDIDATE ───────────────────────────────────
// Says the distance and says where it came from. "Published entry" is the claim
// that separates this from every other Change button, so it is stated rather
// than implied.
export const candidateLine = (c, { distanceWords } = {}) => {
  const km = Number(c?.km);
  const far = typeof distanceWords === "function" && Number.isFinite(km) ? distanceWords(km) : "";
  const walk = Number.isFinite(Number(c?.walk)) && Number(c.walk) <= 25 ? `${Math.round(c.walk)} min walk` : "";
  return [far, walk, "from our own entries"].filter(Boolean).join(" · ");
};

// ── SWAPPING IT IN, WHICH MUST NOT SILENTLY LOSE THE TIME ───────────
//
// The old stop's arrival time is kept: the day was sequenced around it, and a
// replacement that arrives at a different hour changes every stop after it. What
// is NOT kept is the suggested stay, because that belonged to the old place —
// a viewpoint and a museum are not the same length of visit, and carrying the
// number over is exactly the kind of quiet inheritance that makes a plan wrong
// in a way nobody can see.
export const swappedStop = (stop, pick) => {
  if (!pick) return stop;
  const row = pick.row || {};
  return {
    name: said(pick.name),
    town: said(row.town || row.city || row.location || row.region || stop?.town),
    arrivalTime: said(stop?.arrivalTime),
    // Left empty rather than inherited. The guide can fill it; this must not.
    suggestedStay: "",
    note: said(row.desc || row.gemlyxFind || ""),
    _swappedFrom: said(stop?.name),
  };
};

// What the guide says about a stop that was changed. Shown ON the card, not in a
// changelog nobody opens: a traveller who swapped something and then shares the
// guide has a companion who never saw the swap happen.
export const swapNote = (stop) => {
  const from = said(stop?._swappedFrom);
  if (!from) return "";
  return `You swapped this in for ${from}.`;
};

// ── AND THE GATE ────────────────────────────────────────────────────
//
// repairWorked's rule, pointed the other way. A repair has to REDUCE violations;
// a swap only has to not ADD any. Injected rather than imported, so this file
// does not pull constraintCheck's whole dependency set in behind it.
//
// A checker that throws counts as "cannot confirm", and cannot confirm means the
// swap does not go through — the opposite of the hero rule, and deliberately so.
// There, failing open kept a photograph somebody chose; here, failing open ships
// a plan that breaks something they said out loud.
export const swapIsAllowed = (before, after, constraints, { violationsOf } = {}) => {
  if (typeof violationsOf !== "function" || !constraints) return true;
  try {
    const was = violationsOf(before, constraints).length;
    const now = violationsOf(after, constraints).length;
    return now <= was;
  } catch { return false; }
};

export const swapBlockedNote = (violations) => {
  const v = (violations || []).filter(Boolean);
  if (!v.length) return "";
  const first = said(v[0]?.why);
  return `That one breaks something you told me. ${first} Pick another, or tell me the rule has changed.`;
};

// ── PUTTING IT BACK INTO THE GUIDE ──────────────────────────────────
//
// Pure, and returns a NEW guide rather than mutating one. React state is the
// obvious reason; the real one is that swapIsAllowed has to compare the guide
// before against the guide after, and a mutation makes "before" unavailable by
// the time anyone asks for it.
export const guideWithSwap = (guide, dayIndex, stopIndex, pick) => {
  if (!guide || !pick) return guide;
  const days = Array.isArray(guide.days) ? guide.days : [];
  if (!days[dayIndex]) return guide;
  const stops = Array.isArray(days[dayIndex].stops) ? days[dayIndex].stops : [];
  if (!stops[stopIndex]) return guide;
  const nextStops = stops.map((s, i) => (i === stopIndex ? swappedStop(s, pick) : s));
  return {
    ...guide,
    days: days.map((d, i) => (i === dayIndex ? { ...d, stops: nextStops } : d)),
  };
};

// Everything the traveller has ruled out this session, so a second swap does not
// offer back the thing the first one rejected. Reads the guide itself rather
// than keeping a parallel list, because a parallel list is a thing that goes out
// of date the moment somebody reloads.
export const alreadyRuledOut = (guide) => {
  const out = [];
  (Array.isArray(guide?.days) ? guide.days : []).forEach(d => {
    (Array.isArray(d?.stops) ? d.stops : []).forEach(s => {
      const from = said(s?._swappedFrom);
      if (from && !out.includes(from)) out.push(from);
    });
  });
  return out;
};
