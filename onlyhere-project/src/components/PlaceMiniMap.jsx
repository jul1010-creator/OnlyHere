import { useEffect, useRef } from "react";
import L from "leaflet";
import { C } from "../utils/theme";

// ── "Where is this, actually" ──────────────────────────────────────
// Oliver, 6 Aug 2026: "Perhaps include a leaflet map inside blogs as well. So
// people can see the area it is located."
//
// A small map on a place's own page. The point is not navigation, Get
// Directions already does that: it is ORIENTATION. Reading that a town is in
// South Jutland means nothing to most visitors until they see it sitting near
// the German border, or on an island, or an hour up the coast from anywhere.
//
// RENDERS NOTHING WITHOUT REAL COORDINATES, which matters more here than it
// looks. Only town entries currently carry verified lat/lon (shapeForLive stores
// __lat/__lon for towns and nothing else), and the honest answer for an entry
// whose position was never geocoded is no map at all. A map is a claim about
// where something is, and a pin dropped on a guess is a confident wrong answer
// in the most believable possible format.
export const PlaceMiniMap = ({ lat, lon, name, color }) => {
  const holderRef = useRef(null);
  const mapRef = useRef(null);
  const ok = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) && (Number(lat) !== 0 || Number(lon) !== 0);

  useEffect(() => {
    if (!ok || !holderRef.current || mapRef.current) return;
    const map = L.map(holderRef.current, {
      zoomControl: false,
      // The page scrolls. A map that swallows the wheel traps someone
      // mid-article, so zooming is on the buttons and pinch only.
      scrollWheelZoom: false,
      dragging: true,
      attributionControl: true,
    }).setView([Number(lat), Number(lon)], 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, className: "gemlyx-tiles",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const pin = L.divIcon({
      className: "gemlyx-place-pin",
      html: `<div style="width:16px;height:16px;border-radius:50%;background:${color || C.gold};border:3px solid #0A0F1E;box-shadow:0 0 0 3px ${(color || C.gold)}55, 0 2px 8px rgba(0,0,0,.6);"></div>`,
      iconSize: [16, 16], iconAnchor: [8, 8],
    });
    L.marker([Number(lat), Number(lon)], { icon: pin }).addTo(map);
    mapRef.current = map;
    // Same settle problem the guide map hit: Leaflet measures its container the
    // instant L.map() runs, and this one mounts inside a page whose images and
    // fonts are still landing, so it needs a re-measure once layout is real.
    requestAnimationFrame(() => map.invalidateSize());
    const t = setTimeout(() => map.invalidateSize(), 400);
    return () => { clearTimeout(t); map.remove(); mapRef.current = null; };
  }, [ok, lat, lon, color]);

  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);

  if (!ok) return null;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
        Where {name} is
      </div>
      <div ref={holderRef} style={{ height: 190, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}` }} />
    </div>
  );
};
