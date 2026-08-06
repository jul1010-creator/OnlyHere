// ── Is the ferry REQUIRED, or is it just Google's shortcut ──────────
// Oliver, 6 Aug 2026, on the Aarhus Festuge draft: "this transport really seems
// to be the main issue."
//
// THE BUG, exactly. The draft's own uncertainties said: "The driving-route data
// mentioning a ferry crossing between Copenhagen and Aarhus looks inconsistent
// since Aarhus is reached by road/bridge." The draft was right and the pipeline
// was wrong.
//
// Here is why it happened. api/directions.js flags a ferry when the driving
// route's own instructions mention one, and that flag was written for the island
// case: you cannot drive to Fanø without a boat, Google says ferry, so a ferry
// is a fact about the place. But Google optimises for TIME, not for land. For
// Copenhagen to Aarhus it takes the Odden to Aarhus boat because that is faster
// than the Great Belt bridge, and the same flag fired. The pipeline then told
// the writer "THIS JOURNEY REQUIRES A FERRY" about a city on the mainland with a
// motorway running to it.
//
// So the flag was answering the wrong question. "Does the fastest route use a
// ferry" is not "is a ferry required", and only the second one is a fact about
// the destination. THE SECOND QUESTION HAS A DIRECT ANSWER: ask for the route
// again with ferries banned. If a route comes back, the ferry was a shortcut. If
// no route comes back, there is no land connection and the ferry is the way
// there. That is one extra API call, only on routes that mention a ferry, and it
// replaces a guess with a measurement.
//
// Note what this deliberately does NOT do: it never concludes "required" from
// silence. A probe that fails to run at all returns "unknown", because a failed
// lookup proving a geographic fact is the exact error that produced "no
// confirmed public transport route" for well-connected islands.

export const FERRY = {
  NONE: "none",         // no crossing anywhere on the route
  REQUIRED: "required", // no land route exists, the boat is how you get there
  OPTIONAL: "optional", // a land route exists, the boat is just faster
  UNKNOWN: "unknown",   // the probe could not run, so claim nothing
};

// `base` and `avoid` are both /api/directions responses (or null).
// `avoid` is the same query with ferries banned.
export const classifyFerry = ({ base, avoid, probeRan = true } = {}) => {
  const ferryOnRoute = !!(base && (base.hasFerry || (base.ferries || []).length > 0));
  if (!ferryOnRoute) return { status: FERRY.NONE };
  if (!probeRan || avoid === undefined) return { status: FERRY.UNKNOWN };

  // Google returns ZERO_RESULTS as a 200 with an `error` field (see
  // api/directions.js), so "no land route exists" and "the call fell over"
  // arrive here looking alike. Only the first is evidence, so the status is
  // read rather than the mere presence of an error: ZERO_RESULTS and NOT_FOUND
  // mean Google searched and found no road. REQUEST_DENIED, OVER_QUERY_LIMIT,
  // an expired key or a network failure mean nothing was learned, and turning
  // those into "this is an island" would be the same mistake in a new place.
  const err = String(avoid?.error || "");
  if (err) {
    return /ZERO_RESULTS|NOT_FOUND/i.test(err)
      ? { status: FERRY.REQUIRED }
      : { status: FERRY.UNKNOWN, probeError: err };
  }
  if (!avoid || !Number.isFinite(Number(avoid.durationMinutes))) return { status: FERRY.UNKNOWN };

  const landMinutes = Number(avoid.durationMinutes);
  const seaMinutes = Number(base.durationMinutes);
  return {
    status: FERRY.OPTIONAL,
    landMinutes,
    landDurationText: avoid.durationText || "",
    landDistanceText: avoid.distanceText || "",
    savedMinutes: Number.isFinite(seaMinutes) ? Math.round(landMinutes - seaMinutes) : null,
  };
};

// The sentence handed to the writer. Kept here rather than in App.jsx so the
// correction pass and the drafting pipeline say the same thing about the same
// measurement, instead of two prompts drifting apart.
export const ferryFindings = (verdict, namedFerries = []) => {
  const named = namedFerries.filter(f => f && (f.line || f.from || f.to));
  const namedText = named.length
    ? `The crossing on that route: ${named.map(f => `${f.line || "ferry"}${f.agency ? ` operated by ${f.agency}` : ""}, ${f.from} to ${f.to}${f.duration ? `, crossing ${f.duration}` : ""}`).join("; ")}. `
    : "";

  if (verdict.status === FERRY.REQUIRED) {
    return `FERRY REQUIRED, MEASURED NOT GUESSED: the routing API was asked for the same driving route with ferries banned and returned no route at all, so there is no road connection. This place is reached by boat. ${namedText}Never write that it is unreachable or that no public transport exists: a required crossing means a real scheduled service runs. If the crossing is not named above, research the operator's own site and name both ports, or say plainly that the operator should be checked. Do not invent a route.`;
  }
  if (verdict.status === FERRY.OPTIONAL) {
    return `THE FERRY ON THIS ROUTE IS OPTIONAL, NOT REQUIRED, and this was measured: the fastest driving route uses a ferry, but the same query with ferries banned still returns a road route${verdict.landDurationText ? ` (${verdict.landDurationText}${verdict.landDistanceText ? `, ${verdict.landDistanceText}` : ""})` : ""}, so the place is connected by road${verdict.savedMinutes && verdict.savedMinutes > 0 ? ` and the boat only saves about ${verdict.savedMinutes} minutes` : ""}. ${namedText}DO NOT call this place an island, do not say a ferry is needed to reach it, and do not build the getting-there text around a crossing. You may mention the ferry as an optional shortcut for drivers, clearly labelled optional, or leave it out entirely.`;
  }
  if (verdict.status === FERRY.UNKNOWN) {
    return `A ferry appears on the driving route, but the check that decides whether it is required could not run. Say nothing either way: do not call this an island and do not state that a ferry is needed. ${namedText}`;
  }
  return "";
};
