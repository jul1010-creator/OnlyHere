import { useEffect, useRef } from "react";
import L from "leaflet";
import { C } from "../utils/theme";

export const GuideRouteMap = ({ points }) => {
  const holderRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
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
    L.polyline(latlngs, { color: C.gold, weight: 3, dashArray: "1,8", lineCap: "round" }).addTo(group);
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
    const lats = latlngs.map(p => p[0]), lons = latlngs.map(p => p[1]);
    const spreadKm = Math.max(
      (Math.max(...lats) - Math.min(...lats)) * 111.32,
      (Math.max(...lons) - Math.min(...lons)) * 62.06
    );
    if (spreadKm < 0.6) {
      map.setView([lats.reduce((a, b) => a + b, 0) / lats.length, lons.reduce((a, b) => a + b, 0) / lons.length], 12);
    } else {
      map.fitBounds(latlngs, { padding: [44, 44], maxZoom: 14 });
    }
    return () => { group.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)]);
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