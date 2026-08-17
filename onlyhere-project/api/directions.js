// /api/directions.js
// Server-side call to Google's real Directions API — returns the same duration
// Google Maps itself would show, not an estimate. Needs GOOGLE_MAPS_KEY set in
// Vercel's environment variables (NOT prefixed with VITE_ — this stays
// server-only, never exposed to the browser, unlike the VITE_ keys).

// A bare "lat,lon" pair (e.g. "55.6761,12.5683") — the client sends this when
// it already has real, resolved coordinates for a stop.
const isCoordPair = (s) => /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(s.trim());

// Google returns the route shape as an "encoded polyline": a compact string
// where each point is stored as a delta from the previous one, in units of
// 1e-5 degrees, chunked into 5-bit groups. This is Google's own documented
// format and the decoder is the standard algorithm for it.
//
// Returns [[lat, lon], ...] ready for Leaflet, or null when there is nothing
// to decode. NULL MATTERS: the map treats it as "no real geometry available"
// and falls back to its honest dashed straight line, rather than drawing
// something half-decoded and wrong.
const decodePolyline = (encoded) => {
  if (typeof encoded !== "string" || encoded.length === 0) return null;
  const points = [];
  let index = 0, lat = 0, lon = 0;
  try {
    while (index < encoded.length) {
      let result = 0, shift = 0, b;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < encoded.length);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);
      result = 0; shift = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < encoded.length);
      lon += (result & 1) ? ~(result >> 1) : (result >> 1);
      points.push([lat / 1e5, lon / 1e5]);
    }
  } catch { return null; }
  if (points.length < 2) return null;
  // Sanity gate. A malformed string still "decodes" into numbers, and a line
  // drawn through impossible coordinates would fling the map across the globe.
  // Anything not on Earth means the decode is wrong, so return null and let the
  // map fall back to its honest straight line.
  const sane = points.every(([la, lo]) =>
    Number.isFinite(la) && Number.isFinite(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180);
  return sane ? points : null;
};

export default async function handler(req, res) {
  const { origin, destination, mode, departure_time, avoid } = req.query;
  if (!origin || !destination) {
    return res.status(400).json({ error: "origin and destination required" });
  }
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) {
    return res.status(500).json({ error: "GOOGLE_MAPS_KEY not set on the server" });
  }
  // BUG FIX: this used to check mode === "car"/"walk", but the client actually
  // sends "driving"/"walking"/"bicycling"/"transit" (Google's own mode names) —
  // the mismatch meant walking AND driving requests both silently fell through
  // to the else branch and were sent to Google as bicycling every time.
  const validModes = ["driving", "walking", "bicycling", "transit"];
  const travelMode = validModes.includes(mode) ? mode : "transit";

  // BUG FIX: previously ", Denmark" was appended unconditionally, including to
  // an already-resolved coordinate pair like "55.6761,12.5683" — turning it into
  // "55.6761,12.5683, Denmark", which is no longer a valid coordinate and forces
  // Google to fall back to fuzzy text geocoding, silently resolving to a
  // completely different, sometimes very distant point. Only append the country
  // hint to genuine place-name text, never to coordinates.
  const originParam = isCoordPair(origin) ? origin : `${origin}, Denmark`;
  const destinationParam = isCoordPair(destination) ? destination : `${destination}, Denmark`;

  try {
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destinationParam)}&mode=${travelMode}&key=${key}`;
    // departure_time is optional — only transit/driving use it (transit for real
    // schedule-based predictions like late-night checks, driving for live traffic).
    // Must be a future Unix timestamp in seconds; Google rejects a past one.
    if (departure_time && (travelMode === "transit" || travelMode === "driving")) {
      url += `&departure_time=${departure_time}`;
    }
    // ── THE QUESTION THAT DECIDES WHETHER A PLACE IS AN ISLAND ──────
    // Google routes for SPEED, so it takes the Odden to Aarhus boat rather than
    // the Great Belt bridge, and the ferry flag below then fires for a city on
    // the mainland with a motorway running to it. That is what shipped in the
    // Aarhus Festuge draft.
    //
    // Asking again with ferries banned settles it with a measurement: a route
    // still comes back means the boat was a shortcut, no route comes back means
    // there is no land connection. Only "avoid=ferries" is accepted, because
    // this parameter exists for that one question and passing Google arbitrary
    // client-supplied values is how a routing endpoint becomes a proxy.
    if (avoid === "ferries") url += `&avoid=ferries`;
    const r = await fetch(url);
    const data = await r.json();
    if (data.status !== "OK" || !data.routes?.[0]) {
      return res.status(200).json({ error: data.status || "No route found" });
    }
    const leg = data.routes[0].legs[0];

    // ── WHAT THE JOURNEY IS ACTUALLY MADE OF ────────────────────────
    // Oliver, 6 Aug 2026: "Surely the AI can look into these transports that
    // Google Maps come up with?"
    //
    // Yes, and we were throwing it all away. Google's response carries a full
    // step list, and every transit step carries transit_details: the LINE NAME,
    // the operating AGENCY, the boarding and alighting stops, and a vehicle
    // type. One of those types is FERRY. So for an island journey Google will
    // often hand back the actual crossing, named, with its operator, and this
    // endpoint was discarding it and returning a bare duration.
    //
    // That is the island problem in one sentence: not that Google does not know
    // about Fanølinjen, but that nothing here ever asked.
    //
    // Kept deliberately compact. The raw steps object is enormous and most of
    // it is HTML instructions for a turn-by-turn UI this app does not have.
    const steps = (leg.steps || []).map(s => {
      const td = s.transit_details;
      if (!td) {
        // `mins` alongside the text: the caller needs to ADD these up to say how
        // much of a journey is spent on board and how much on foot, and parsing
        // "1 hour 22 mins" back out of prose to do arithmetic is how a lazy
        // quantifier turned "5 hours 53 mins" into "5h" once already.
        return { mode: (s.travel_mode || "").toLowerCase(), duration: s.duration?.text || "", mins: Math.round((s.duration?.value || 0) / 60), distance: s.distance?.text || "" };
      }
      const line = td.line || {};
      return {
        mode: "transit",
        vehicle: (line.vehicle?.type || "").toUpperCase(),      // BUS, HEAVY_RAIL, FERRY, ...
        line: line.short_name || line.name || "",
        agency: (line.agencies || []).map(a => a.name).filter(Boolean).join(", "),
        // ── AND THE AGENCY'S OWN URL, WHICH IS A LICENCE TERM ─────────
        // 17 Aug 2026. The joined name string above has been kept since 6 Aug
        // and it is not enough on its own. Google's Directions policy says, in
        // as many words, that an application displaying these results "must
        // display the names and URLs of the transit agencies that supply the
        // trip results". The URL was in the same `agencies` array the names come
        // out of, and nothing asked for it.
        //
        // Kept as an array of objects rather than a second joined string,
        // because a name and its link have to stay attached to each other: two
        // parallel comma-joined strings is how a bus company ends up linking to
        // a railway. The old `agency` string stays exactly as it was, so
        // everything reading it is untouched.
        agencies: (line.agencies || [])
          .map(a => ({ name: String(a?.name || "").trim(), url: String(a?.url || "").trim() }))
          .filter(a => a.name)
          .slice(0, 3),
        from: td.departure_stop?.name || "",
        to: td.arrival_stop?.name || "",
        departure: td.departure_time?.text || "",
        arrival: td.arrival_time?.text || "",
        duration: s.duration?.text || "",
        mins: Math.round((s.duration?.value || 0) / 60),
        stops: td.num_stops,
      };
    });

    // The ferry legs on their own, because for an island entry this is THE
    // fact that decides the getting-there section, and it should not have to be
    // dug out of a step list by whatever reads this.
    // DRIVING ROUTES DO NOT HAVE transit_details, so a car journey to an island
    // yields no FERRY step even though it plainly crosses one. Measured live:
    // Copenhagen to Sønderho returns ZERO_RESULTS by transit at every time of
    // day, but 4h03 / 318km by car, and you cannot drive to Fanø without the
    // boat. Google marks those segments in the step's own instruction text.
    //
    // So this detects that a crossing is REQUIRED without inventing its name.
    // "A ferry is part of this journey" is a true and useful fact on its own,
    // and it is the one that stops a draft claiming an island is unreachable.
    const drivingFerryStep = (leg.steps || []).some(s =>
      /\bferry\b|\bfærge|\bfaerge/i.test(String(s.html_instructions || "") + " " + String(s.maneuver || "")));

    const ferries = steps.filter(s => s.vehicle === "FERRY").map(s => ({
      line: s.line, agency: s.agency, from: s.from, to: s.to,
      departure: s.departure, arrival: s.arrival, duration: s.duration,
    }));

    return res.status(200).json({
      steps,
      ferries,
      // Named ferries when the transit feed carries them, otherwise the honest
      // weaker fact: this journey requires a crossing, we just cannot name it
      // from here. Both are better than the silence that produced "no confirmed
      // public transport route" for an island with a frequent, well-used ferry.
      hasFerry: ferries.length > 0 || drivingFerryStep,
      ferryUnnamed: ferries.length === 0 && drivingFerryStep,
      durationText: leg.duration.text,   // e.g. "24 mins" — Google's own real number
      durationMinutes: Math.round(leg.duration.value / 60),
      distanceText: leg.distance.text,
      distanceMeters: leg.distance.value,
      // THE ACTUAL SHAPE OF THE ROUTE, added Aug 5 2026 so the guide map can
      // draw the real thing instead of a straight line between two dots
      // (Oliver: "It shouldn't be difficult to make a route").
      //
      // Why it comes from HERE rather than from a second routing service:
      // whatever draws the line and whatever states the duration have to be
      // the same journey, or they quietly contradict each other. Measured on
      // the live site before writing this: Google and OpenRouteService agree
      // within 1-2% on land routes but come apart completely over water
      // (Copenhagen to Samsø is 145 km by Google, which takes the ferry, and
      // 324 km by OpenRouteService, which drives around). Returning Google's
      // own polyline next to Google's own duration makes that whole class of
      // disagreement impossible by construction.
      polyline: decodePolyline(data.routes[0].overview_polyline?.points),
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
