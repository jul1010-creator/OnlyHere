// ── A CONSTRAINT THE TRAVELLER STATED IS NOT A SUGGESTION ───────────
//
// 25 Aug 2026. Oliver read Layla's reviews. Three of the seven recurring
// complaints are one defect wearing three hats:
//
//   "Wanted a train trip from Denmark to Italy, kept being routed through
//    airports." "Asked for Faro, repeatedly got Lisbon." "Entered hotels we had
//    already booked; it recognised them in the chat and then omitted them from
//    the itinerary, or replaced them with completely different ones."
//
// A person said a thing. The model was told. The itinerary broke it anyway.
//
// ── AND THIS REPOSITORY ALREADY HAS THE SENTENCE FOR IT ─────────────
//
// HANDOFF_25AUG, written for a different bug on 24 August: **a constraint sent
// is not a constraint honoured.** Three constraints leave this app and every one
// of them was audited that day. `avoid=ferries` is a PREFERENCE Google relaxes,
// so the answer is now read off the returned route. `include_domains` came back
// unchecked and is now filtered, with `offPin` reporting what was dropped.
// `maxAge` is Firecrawl's own cache and cannot be confirmed, so that is recorded
// rather than assumed.
//
// Every one of those is a constraint sent to an API. **The traveller's own
// constraints were never audited at all**, and they are the ones that matter:
// nobody is upset that a search was silently widened, and everybody is upset
// that they said no flights and got a flight.
//
// So this is that audit, one level up. A constraint stated in conversation is a
// constraint sent to a model, and the guide that comes back is checked against
// it rather than trusted.
//
// ── THE PROTOTYPE ALREADY EXISTS AND IS ONE FIELD WIDE ──────────────
//
// `titlePromises` does exactly this for the headline: it reads what the title
// CLAIMS, compares it against the stops that actually exist, and returns what is
// promised and absent. App.jsx then rewrites the title and **only accepts the
// rewrite if the rewrite fixed it** (`titlePromises(cleaned, ...).length === 0`).
// Claim, check, repair, verify the repair. This is that shape applied to the six
// things a traveller says that a guide can break.
//
// ── AND A VIOLATION THAT CANNOT BE FIXED MUST BE SPOKEN ─────────────
//
// The difference that matters is not the checking. It is what happens when the
// check fails and the guide cannot be repaired. Layla ships the violation
// silently, which is why the review says "recommended a hotel roughly 100 miles
// from where they wanted to stay" rather than "told me it could not find one
// nearby". Silence is what turns a limitation into a betrayal.
//
// So `constraintNote` exists, and it is the whole point of the file: when the
// guide breaks something the traveller said, the guide says so, in the guide,
// in their own words back to them.
//
// ── CONSTRAINTS ARE PASSED IN, NOT READ IN ──────────────────────────
//
// Injected rather than imported from tripBrief, for the reason `reachOf`,
// `townPoint`, `lookup` and `isAbout` are all injected: this file must not reach
// into the brief and make a cycle, and a checker that can be handed a
// hand-written constraint set is a checker that can be tested without building a
// conversation first.
//
// WHAT tripBrief STILL HAS TO LEARN, written down rather than assumed, because
// two of these have no reader yet and the checker is useless without them:
//
//   `excluded`  no slot exists. "We're not interested in Copenhagen" is the most
//               common constraint in travel chat and nothing reads it today.
//   `stay.name` readStay returns "booked" or "not booked" and never WHICH hotel,
//               so the Layla complaint that hurt most cannot be checked yet.
//   `maxBases`  "we'd rather not change hotels every night, two or three bases"
//               is unread. It is a number in a sentence.

const said = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

// Danish letters folded the way placeUrl already folds them, locally rather than
// imported, because this file must stay free of the slug machinery: comparing
// "Nykobing" with "Nykøbing" is a comparison, not a URL.
const fold = (v) => said(v).toLowerCase()
  .replace(/[æä]/g, "ae").replace(/[øö]/g, "o").replace(/[åa]̊/g, "aa").replace(/å/g, "aa")
  .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// A word, not a substring. "Ribe" must not match "Ribera", and an excluded
// "Als" must not fire on "Falster".
const namesMatch = (a, b) => {
  const x = fold(a), y = fold(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const wrap = (h, n) => new RegExp(`(?:^| )${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$| )`).test(h);
  return wrap(x, y) || wrap(y, x);
};

export const CONSTRAINT_KINDS = ["excluded", "transport", "stay", "bases", "dates"];

const allStops = (guide) =>
  (Array.isArray(guide?.days) ? guide.days : []).flatMap(d => Array.isArray(d?.stops) ? d.stops : []).filter(Boolean);

// Every phrase in the guide that describes how somebody gets from one place to
// the next. `legMode` is injected because detectLegMode lives in helpers and
// this file has no business importing the whole of it.
const allLegText = (guide) =>
  (Array.isArray(guide?.days) ? guide.days : []).flatMap(d => {
    const legs = Array.isArray(d?.glance?.legs) ? d.glance.legs : [];
    return legs.map(l => said(l?.how)).filter(Boolean);
  });

// Where they sleep, per day, in whatever field carries it.
const stayTexts = (guide) =>
  (Array.isArray(guide?.days) ? guide.days : []).map(d =>
    said(d?.glance?.recommendedStay) || said(d?.glance?.stayArea) || said(d?.glance?.accommodation) || ""
  ).filter(Boolean);

// ── THE CHECKS ──────────────────────────────────────────────────────
//
// Each returns a violation or null. Every violation carries what was SAID and
// what was FOUND, because a report that only names the rule cannot be argued
// with and cannot be shown to the person who set it.
const checkExcluded = (guide, constraints) => {
  const out = [];
  (constraints?.excluded || []).forEach(place => {
    const hit = allStops(guide).find(s => namesMatch(s?.town, place) || namesMatch(s?.name, place));
    if (hit) out.push({
      kind: "excluded", said: place, found: said(hit.name) || said(hit.town),
      why: `You said you did not want ${place}, and ${said(hit.name) || said(hit.town)} is in ${place}.`,
      fixable: true,
    });
  });
  return out;
};

const checkTransport = (guide, constraints, modeOf) => {
  const ruled = (constraints?.transport?.ruledOut || []).map(said).filter(Boolean);
  if (!ruled.length) return [];
  const out = [];
  allLegText(guide).forEach(text => {
    let mode = "";
    // A matcher that throws never passes, the same rule priceSource follows: a
    // broken mode detector must not quietly clear every leg.
    try { mode = said(typeof modeOf === "function" ? modeOf(text) : ""); } catch { mode = ""; }
    ruled.forEach(bad => {
      if (!mode || !namesMatch(mode, bad)) return;
      out.push({
        kind: "transport", said: `no ${bad}`, found: text,
        why: `You ruled out travelling by ${bad}, and this trip has a leg that does: "${text}".`,
        fixable: false,
      });
    });
  });
  return out;
};

// The complaint that hurt most: "entered hotels we had already booked, it
// recognised them in the chat and then replaced them with completely different
// ones." A booked hotel is the most fixed point in a trip and the cheapest
// possible thing to honour.
const checkStay = (guide, constraints) => {
  const name = said(constraints?.stay?.name);
  if (!name) return [];
  const texts = stayTexts(guide);
  if (!texts.length) return [{
    kind: "stay", said: name, found: "",
    why: `You have already booked ${name}, and this trip says nothing about where you sleep.`,
    fixable: true,
  }];
  if (texts.some(t => namesMatch(t, name) || fold(t).includes(fold(name)))) return [];
  return [{
    kind: "stay", said: name, found: texts[0],
    why: `You have already booked ${name}, and this trip puts you somewhere else: "${texts[0]}".`,
    fixable: true,
  }];
};

const checkBases = (guide, constraints) => {
  const max = Number(constraints?.maxBases);
  if (!Number.isFinite(max) || max <= 0) return [];
  const bases = [...new Set(stayTexts(guide).map(fold).filter(Boolean))];
  if (bases.length <= max) return [];
  return [{
    kind: "bases", said: `at most ${max}`, found: `${bases.length}`,
    why: `You asked not to change hotels more than ${max === 1 ? "once" : `${max} times`}, and this trip has ${bases.length} separate bases in it.`,
    fixable: true,
  }];
};

const isoDay = (v) => {
  const s = String(v || "");
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : "";
};

const checkDates = (guide, constraints) => {
  const from = isoDay(constraints?.dates?.from);
  if (!from) return [];
  const arrival = isoDay(guide?._arrivalDate);
  const out = [];
  if (arrival && arrival !== from) out.push({
    kind: "dates", said: from, found: arrival,
    why: `You said the trip starts on ${from}, and this one is built from ${arrival}.`,
    fixable: true,
  });
  const to = isoDay(constraints?.dates?.to);
  if (to && from) {
    const span = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
    const days = Array.isArray(guide?.days) ? guide.days.length : 0;
    if (days && span > 0 && days > span) out.push({
      kind: "dates", said: `${span} days`, found: `${days} days`,
      why: `You are here from ${from} to ${to}, which is ${span} days, and this trip has ${days} in it.`,
      fixable: true,
    });
  }
  return out;
};

// ── THE AUDIT ───────────────────────────────────────────────────────
//
// `modeOf` is injected. Pass helpers.detectLegMode from the caller.
export const constraintViolations = (guide, constraints, { modeOf = null } = {}) => {
  if (!guide || typeof guide !== "object" || !constraints || typeof constraints !== "object") return [];
  return [
    ...checkExcluded(guide, constraints),
    ...checkTransport(guide, constraints, modeOf),
    ...checkStay(guide, constraints),
    ...checkBases(guide, constraints),
    ...checkDates(guide, constraints),
  ];
};

export const violationsOfKind = (violations, kind) => (violations || []).filter(v => v.kind === kind);

// ── AND THE SENTENCE, WHICH IS THE WHOLE POINT ──────────────────────
//
// Layla ships the violation and says nothing, which is how "could not find a
// hotel nearby" becomes "recommended a hotel 100 miles away". A limitation
// stated is a limitation. A limitation hidden is a betrayal.
//
// Written for the TRAVELLER and not for a log, so it quotes what they said back
// to them. Same test the evidence tiers use: if you cannot say it out loud to
// the person relying on it, it is the wrong sentence.
export const constraintNote = (violations) => {
  const v = (violations || []).filter(Boolean);
  if (!v.length) return "";
  const lines = v.map(x => x.why).filter(Boolean);
  const head = v.length === 1
    ? "One thing here does not match what you told me."
    : `${v.length} things here do not match what you told me.`;
  const unfixable = v.some(x => !x.fixable);
  const tail = unfixable
    ? "I could not build the trip without it. It is here so you can decide, rather than find out on the day."
    : "Say the word and I will rebuild around it.";
  return `${head} ${lines.join(" ")} ${tail}`;
};

// ── THE REPAIR GATE, WHICH IS titlePromises' RULE GENERALISED ───────
//
// App.jsx accepts a rewritten title only when the rewrite actually fixed the
// problem. Anything that repairs a guide against a constraint has to clear the
// same bar, because a repair that leaves the violation in place is worse than
// no repair: it spends a model call and moves the sentence around.
export const repairWorked = (before, after, constraints, opts) =>
  constraintViolations(after, constraints, opts).length < constraintViolations(before, constraints, opts).length;

// ── AND THE INVARIANT THAT IS ALREADY TRUE, NAMED SO IT STAYS TRUE ──
//
// Layla complaint 5: "it pushes hotels", and reviewers feel steered toward
// bookable inventory. That cannot happen here today: there are ZERO references
// to bookingUrl, airbnbUrl, tiqets, ticketmaster or any affiliate id anywhere in
// the planner and guide-build window of App.jsx, checked 25 Aug 2026. Selection
// happens first and affiliates are attached afterwards, to fulfil what the
// itinerary already asked for.
//
// It is true by accident of ordering rather than by rule, which is exactly how
// invariants stop being true. The suite asserts it now.
export const INVENTORY_MAY_NOT_SELECT = [
  "bookingUrl", "airbnbUrl", "tiqets", "ticketmaster", "BOOKING_AFFILIATE_ID", "affiliateHref",
];
