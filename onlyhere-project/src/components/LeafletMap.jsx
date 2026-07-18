import { useEffect, useRef } from "react";
import L from "leaflet";
import { C } from "../theme.js";

export const LeafletMap = ({ center, zoom, overlayLabel }) => {
  const holderRef = useRef(null);
  const mapRef = useRef(null);
  useEffect(() => {
    if (!holderRef.current || mapRef.current) return;
    const map = L.map(holderRef.current, { zoomControl: false }).setView(center, zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: "gemlyx-tiles",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    L.control.zoom({ position: "bottomleft" }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (mapRef.current) mapRef.current.setView(center, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom]);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={holderRef} style={{ width: "100%", height: "100%" }} />
      {overlayLabel && (
        <div style={{ position: "absolute", top: 8, left: 8, right: 8, zIndex: 500, background: "rgba(10,15,30,0.88)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: C.text, fontWeight: 600, pointerEvents: "none" }}>
          📍 {overlayLabel}
        </div>
      )}
    </div>
  );
};

