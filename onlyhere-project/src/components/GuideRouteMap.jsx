import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { C } from "../utils/theme";

// ── REAL ROUTE GEOMETRY ────────────────────────────────────────────
// Oliver, 5 Aug 2026: "It shouldn't be difficult to make a route…", with
// explicit permission to fix this inside guide code.
//
// This map used to draw ONE dashed straight line through every stop. That is
// not a route, it is a join-the-dots, and on any day with real travel in it
// the line cut across water and countryside that nothing actually crosses.
//
// Now each leg is fetched from /api/directions, the SAME endpoint that
// produces the duration shown on that leg's chip, and drawn as its real shape.
// Same endpoint is the whole point: whatever draws the line and whatever
// states the time have to describe the same journey. Measured on the live site
// first, Google and OpenRouteService agree within 1-2% on land but come apart
// completely over water (Copenhagen to Samsø: 145 km one way, 324 km the
// other), so pulling geometry from a second service would have quietly
// reintroduced exactly that contradiction.
//
// WHAT HAPPENS WHEN IT CANNOT GET A REAL ROUTE, which is the part that keeps
// this honest: the leg keeps its old dashed straight line. A dashed line
// clearly reads as "roughly this way" rather than pretending to be a road.
// The map never invents a route it did not receive.
const geometryCache = new Map();   // module-level: outlives remounts, same discipline as liveContent

const legKey = (from, to, mode) => `${from[0].toFixed(4)},${from[1].toFixed(4)}|${to[0].toFixed(4)},${to[1].toFixed(4)}|${mode}`;

const fetchLegGeometry = async (from, to, mode) => {
  const key = legKey(from, to, mode);
  if (geometryCache.has(key)) return geometryCache.get(key);
  const promise = (async () => {
    try {
      const res = await fetch(`/api/directions?origin=${from[0]},${from[1]}&destination=${to[0]},${to[1]}&mode=${encodeURIComponent(mode)}`);
      const data = await res.json();
      return Array.isArray(data?.polyline) && data.polyline.length > 1 ? data.polyline : null;
    } catch { return null; }
  })();
  // Cache the PROMISE, not the result: two day cards mounting at once must
  // share one request rather than racing to make the same call twice.
  geometryCache.set(key, promise);
  return promise;
};

export const GuideRouteMap = ({ points, legs }) => {
  const holderRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  // One entry per leg: the real polyline, or null once we know there isn't one.
  const [geometry, setGeometry] = useState({});

  // Fetch each leg's real shape. Deliberately separate from the drawing effect
  // so a slow or failed lookup never delays the map appearing: the dashed
  // fallback renders immediately and each leg upgrades itself as it arrives.
  useEffect(() => {
    if (!points || points.length < 2) return;
    let alive = true;
    points.slice(0, -1).forEach((p, i) => {
      const a = [p.lat, p.lon], b = [points[i + 1].lat, points[i + 1].lon];
      const mode = legs?.[i]?.mode || "driving";
      // Two stops that resolved to the same point have no leg to draw. This is
      // the town-centre collapse that caused the "1 min walk that was really 30"
      // bug; here it would just be a wasted API call.
      if (Math.abs(a[0] - b[0]) < 0.0002 && Math.abs(a[1] - b[1]) < 0.0002) return;
      fetchLegGeometry(a, b, mode).then(poly => {
        if (alive) setGeometry(prev => (prev[legKey(a, b, mode)] === poly ? prev : { ...prev, [legKey(a, b, mode)]: poly }));
      });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points), JSON.stringify(legs)]);

  useEffect(() => {
    if (!holderRef.current || points.length < 2) return;
    if (!mapRef.current) {
      const map = L.map(holderRef.current, { zoomControl: false, dragging: true, scrollWheelZoom: false }).setView([points[0].lat, points[0].lon], 8);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, className: "gemlyx-tiles",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      L.control.zoom({ position: "bottomleft" }).addTo(map);
      mapRef.current = map;
      // BUG FIX (Oliver: "leaflet maps look bad, too zoomed in and poor
      // animation"): Leaflet measures its container's real pixel size the
      // instant L.map() is called — but this map lives inside a day card
      // that just mounted inside a scrollable page, whose 180px-tall holder
      // may not have its final layout size yet (fonts/images still
      // settling, or the day card's own entrance still running). A map
      // created against a stale/zero size renders tiles at the wrong scale
      // and pans roughly until something forces a re-measure — which reads
      // exactly as "looks off" and "poor animation" the first time it's
      // seen. invalidateSize() forces that re-measure once the container
      // has genuinely settled.
      requestAnimationFrame(() => map.invalidateSize());
    }
    const map = mapRef.current;
    map.invalidateSize();
    if (layerRef.current) { layerRef.current.remove(); }
    const group = L.layerGroup().addTo(map);
    layerRef.current = group;
    const latlngs = points.map(p => [p.lat, p.lon]);

    // Draw each leg separately, so one leg having a real route and the next one
    // not is drawn honestly rather than averaged into a single misleading line.
    // Solid = this is the actual route. Dashed = we could not get one, this is
    // only the direction of travel.
    const drawn = [];
    latlngs.slice(0, -1).forEach((a, i) => {
      const b = latlngs[i + 1];
      const mode = legs?.[i]?.mode || "driving";
      const poly = geometry[legKey(a, b, mode)];
      if (poly && poly.length > 1) {
        L.polyline(poly, { color: C.gold, weight: 3.5, opacity: 0.95, lineCap: "round", lineJoin: "round" }).addTo(group);
        drawn.push(...poly);
      } else {
        L.polyline([a, b], { color: C.gold, weight: 3, dashArray: "1,8", lineCap: "round", opacity: 0.85 }).addTo(group);
        drawn.push(a, b);
      }
    });
    points.forEach((p, i) => {
      L.circleMarker([p.lat, p.lon], { radius: 7, color: "#0A0F1E", weight: 2, fillColor: C.gold, fillOpacity: 1 })
        .bindTooltip(`${i + 1}. ${p.name}`, { permanent: true, direction: "top", offset: [0, -8], className: "gemlyx-map-label" })
        .addTo(group);
    });
    // BUG FIX, same report: padding 28 with no zoom cap meant a day with only
    // 2-3 genuinely close-together stops (common — most days have real stops
    // within the same town) zoomed in tight enough to feel claustrophobic,
    // basically a solid gold line with no surroundings visible. More padding
    // plus a hard maxZoom keeps every route readable at a glance instead of
    // zooming in as far as the points technically allow.
    // COLLAPSED-POINTS FIX (Oliver's screenshot: a day map showing one lone
    // marker on featureless close-up water/coast — "this maps…"): when a
    // day's stops all resolve to (nearly) the same coordinate — common in a
    // small village where several stops share the town-center point — fitBounds
    // zooms to the maximum allowed on a box that is essentially a dot, which
    // shows nothing recognizable. If the whole route spans less than ~600m,
    // show the AREA instead: center on it at a town-scale zoom so there's real
    // geography (coastline, streets, the village shape) around the marker.
    // Fit to what is actually DRAWN, not just to the stop markers. A real route
    // can swing well outside the box its two endpoints make (a ferry crossing,
    // a motorway going the long way round a fjord), and fitting to the markers
    // alone would crop exactly the part that explains the journey.
    const extent = drawn.length > 1 ? drawn : latlngs;
    const lats = extent.map(p => p[0]), lons = extent.map(p => p[1]);
    const spreadKm = Math.max(
      (Math.max(...lats) - Math.min(...lats)) * 111.32,
      (Math.max(...lons) - Math.min(...lons)) * 62.06
    );
    if (spreadKm < 0.6) {
      map.setView([lats.reduce((a, b) => a + b, 0) / lats.length, lons.reduce((a, b) => a + b, 0) / lons.length], 12);
    } else {
      map.fitBounds(extent, { padding: [44, 44], maxZoom: 14 });
    }
    return () => { group.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points), JSON.stringify(legs), geometry]);
  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);
  if (points.length < 2) return null;
  return <div ref={holderRef} style={{ width: "100%", height: "100%" }} />;
};

// Renders a real, official Instagram post/reel using Instagram's own embed
// widget (embed.js) — free, no API key or app review needed, since it's
// their sharing mechanism (same idea as embedding a tweet), not scraping
// or re-hosting someone else's video ourselves.
// Generic At-a-Glance card — works for any type by passing a list of
// {icon, label, value} rows. Replaces the old event-only hardcoded version
// so Towns and Attractions (Free Entrance + Booking) can use the exact same
// premium pattern instead of a bespoke one-off per type.