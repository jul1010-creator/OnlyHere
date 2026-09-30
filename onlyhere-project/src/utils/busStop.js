// ── THE NEAREST BUS, FROM THE CITY'S OWN TIMETABLE ──────────────────
//
// Oliver, 29 Sep 2026, uploading Klaipėda's open GTFS: "Here is the GTFS".
//
// In Denmark the arrival row is earned by a measured Google journey from
// Copenhagen (see arrivalGlanceRow in journey.js). That does not carry over:
// a journey measured from the Lithuanian hub ends at Klaipėda's train station
// four hours later and says nothing about the museum across town. What a
// visitor standing in Klaipėda needs is the stop outside the door, which bus
// calls there, and where to see the next one.
//
// All three come out of the operator's own feed, extracted into
// data/klaipedaStops.js by tools/klaipedaStops.mjs. Nothing is fetched and no
// key is spent, and the one thing that goes stale (the departures) is not in
// the file: the row links to the stop's page on stops.lt, which is live.
//
// ── EARNED BY DISTANCE, LIKE THE DANISH ROW ─────────────────────────
// A stop more than BUS_STOP_MAX_M away in a straight line is not "the stop
// for" a place, it is a stop in the same part of town, so no row. The walk is
// the straight line times WALK_DETOUR at WALK_M_PER_MIN, called "about" on the
// card because it is an estimate and not a route. Outside the feed's area the
// nearest stop is kilometres off, so Danish entries draw nothing here and keep
// their measured row.
import { KLAIPEDA_STOPS, KLAIPEDA_STOP_PAGE } from "../data/klaipedaStops";
import { placeCoords } from "./guideEnrichment";
import { arrivalGlanceRow } from "./journey";

export const BUS_STOP_MAX_M = 800;
export const WALK_DETOUR = 1.3;
export const WALK_M_PER_MIN = 80;
export const LINES_SHOWN = 5;

const metres = (a, b) => {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// { name, lines, metres, walkMin, href } or null.
export const nearestBusStop = (point, stops = KLAIPEDA_STOPS) => {
  const lat = Number(point?.lat), lon = Number(point?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  let best = null;
  for (const [name, lines, pts] of stops) {
    for (const [pLat, pLon, page] of pts) {
      // Cheap box first: a degree of latitude is 111 km, so anything more than
      // 0.02 degrees off in either axis is well past the limit.
      if (Math.abs(pLat - lat) > 0.02 || Math.abs(pLon - lon) > 0.04) continue;
      const m = metres([lat, lon], [pLat, pLon]);
      if (m <= BUS_STOP_MAX_M && (!best || m < best.metres)) best = { name, lines: String(lines).split(" ").filter(Boolean), metres: Math.round(m), page };
    }
  }
  if (!best) return null;
  return {
    name: best.name,
    lines: best.lines,
    metres: best.metres,
    walkMin: Math.max(1, Math.round((best.metres * WALK_DETOUR) / WALK_M_PER_MIN)),
    href: best.page ? `${KLAIPEDA_STOP_PAGE}${best.page}` : "",
  };
};

// "bus 9", "buses 1, 8 and 15", "buses 2, 3, 4, 5, 6 and 9 more".
export const linesPhrase = (lines) => {
  const list = Array.isArray(lines) ? lines.filter(Boolean) : [];
  if (!list.length) return "";
  if (list.length === 1) return `bus ${list[0]}`;
  if (list.length <= LINES_SHOWN) return `buses ${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
  return `buses ${list.slice(0, LINES_SHOWN).join(", ")} and ${list.length - LINES_SHOWN} more`;
};

// The At a Glance row, in the shape AtAGlanceCard takes.
export const busStopRow = (point) => {
  const stop = nearestBusStop(point);
  if (!stop) return null;
  const lines = linesPhrase(stop.lines);
  return {
    icon: "🚌",
    label: "Nearest Bus Stop",
    value: `${stop.name}, about ${stop.walkMin} min walk${lines ? ` (${lines})` : ""}`,
    link: stop.href ? { href: stop.href, label: "Live departures" } : null,
  };
};

// What every arrival row on a detail page asks: the bus from the local feed
// where there is one, otherwise the measured Danish row.
export const arrivalOrBusRow = (item, kind, point = null) =>
  busStopRow(point || placeCoords(item)) || arrivalGlanceRow(item, kind);
