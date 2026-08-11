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
// NEIGHBOURS (Oliver, 7 Aug: "on the mini map, showing neighboring attractions
// and towns is worth it too?"). Yes, with a cap. The job of this map is still
// orientation, and a dozen pins turns a place's own page into a worse copy of
// the map view. So: the few nearest PUBLISHED entries only, each one a page he
// has already written and fact-checked, and the entry you are reading stays the
// obvious one on the map. Everything else is a small quiet dot.
//
// This became possible at all only once coordinates were stored for every
// content type rather than towns alone. Entries published before that have
// none, so they simply do not appear, which is the same rule as the map itself:
// no coordinate, no pin, rather than a pin somewhere plausible.
export const PlaceMiniMap = ({ lat, lon, name, color, neighbours, onOpenNeighbour }) => {
  const holderRef = useRef(null);
  const mapRef = useRef(null);
  // ── THE MAP WAS TORN DOWN AND REBUILT ON EVERY PARENT RENDER ──────
  // The effect below listed `neighbours` and `onOpenNeighbour` in its deps.
  // DetailPage passes `neighbours={nearbyEntries(...)}` — a fresh array literal
  // every render — and `onOpenNeighbour={(n) => ...}` — a fresh closure. It is
  // rendered unmemoised inside GemlyxApp, so ANY state change anywhere in that
  // component ran `map.remove()` and built a whole new Leaflet instance:
  // hearting a place, a toast expiring, a window resize.
  //
  // What that looked like: the map blanks, re-downloads its tiles from
  // openstreetmap.org, and snaps back to the fitted bounds, throwing away
  // wherever the person had panned or zoomed to. Plus a steady stream of
  // duplicate tile requests against a service with a published usage policy.
  //
  // The callback goes in a ref so a new closure each render cannot invalidate
  // anything, and the neighbours are depended on by VALUE via a signature
  // string rather than by array identity.
  const openNeighbourRef = useRef(onOpenNeighbour);
  openNeighbourRef.current = onOpenNeighbour;
  const neighbourKey = (Array.isArray(neighbours) ? neighbours : [])
    .slice(0, 5).map(n => `${n?.name}@${n?.lat},${n?.lon}`).join("|");
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
    // Neighbours first, so the entry's own pin is drawn last and sits on top of
    // anything it overlaps.
    const near = Array.isArray(neighbours) ? neighbours.slice(0, 5) : [];
    near.forEach((n, i) => {
      const dot = L.divIcon({
        className: "gemlyx-near-pin",
        html: `<div style="width:10px;height:10px;border-radius:50%;background:#EFE9D6;border:2px solid #0A0F1E;box-shadow:0 1px 5px rgba(0,0,0,.55);opacity:.9;"></div>`,
        iconSize: [10, 10], iconAnchor: [5, 5],
      });
      const m = L.marker([n.lat, n.lon], { icon: dot, title: n.name, keyboard: false }).addTo(map);
      // A tooltip rather than a popup: a popup steals the map and needs closing,
      // and this is a label, not a card.
      m.bindTooltip(`${n.name}${n.km != null ? ` · ${n.km < 10 ? n.km.toFixed(1) : Math.round(n.km)} km` : ""}`, { direction: "top", offset: [0, -6], opacity: 0.95 });
      m.on("click", () => openNeighbourRef.current?.(n));
    });
    L.marker([Number(lat), Number(lon)], { icon: pin, zIndexOffset: 1000 }).addTo(map);
    // Fit to everything that is actually on the map, so the neighbours are not
    // sitting off the edge at a fixed zoom 11. Padded, and capped at 11 so a
    // lone entry with no neighbours does not zoom to street level.
    if (near.length) {
      map.fitBounds(L.latLngBounds([[Number(lat), Number(lon)], ...near.map(n => [n.lat, n.lon])]).pad(0.28), { maxZoom: 11 });
    }
    mapRef.current = map;
    // Same settle problem the guide map hit: Leaflet measures its container the
    // instant L.map() runs, and this one mounts inside a page whose images and
    // fonts are still landing, so it needs a re-measure once layout is real.
    requestAnimationFrame(() => map.invalidateSize());
    const t = setTimeout(() => map.invalidateSize(), 400);
    return () => { clearTimeout(t); map.remove(); mapRef.current = null; };
    // neighbourKey, not `neighbours`: same neighbours in the same places must
    // not count as a change just because the array is a new object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, lat, lon, color, neighbourKey]);

  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);

  if (!ok) return null;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
        Where {name} is
      </div>
      <div ref={holderRef} style={{ height: 190, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}` }} />
      {Array.isArray(neighbours) && neighbours.length > 0 && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 7, lineHeight: 1.6 }}>
          The pale dots are other Gemlyx entries nearby. Tap one to open it.
        </div>
      )}
    </div>
  );
};
