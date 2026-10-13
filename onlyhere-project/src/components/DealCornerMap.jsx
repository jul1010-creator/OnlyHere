// ── A SMALL MAP IN THE CORNER OF A DEAL ─────────────────────────────
//
// Oliver, 13 Oct 2026, of the deals on the Klaipėda page: "Put maps on them
// in the corner.. so we get that zoom down that we made in the travel guide."
// Built first as a flight from the Baltic coast down to the street. Then, the
// same day: "Is it possible to have a permanent closure of where it is
// located? A permanent map inputted". So no flight: the map is a fixed close
// view of the street the place is on, drawn once and left there.
//
// A picture, not a control: nothing on it can be dragged or zoomed, so the
// page still scrolls under a thumb. Tapping it does what "Walk there" does.
//
// DRAWN WHEN IT FIRST COMES NEAR THE SCREEN, THEN KEPT. A page that opened by
// drawing a dozen maps at once would be slow on a phone at the terminal, so
// each one waits for its card; once drawn it stays until the page closes.
//
// Leaflet is loaded when the first map is built rather than at import, because
// it reaches for `window` the moment it loads, and the helpers in
// DealsNearYou.jsx are read by the test suite with no window at all.
import { useEffect, useRef } from "react";
import { addTileLayer } from "../utils/mapTiles";
import { C } from "../utils/theme";

// The street and a block or two around it: about 260 metres across at
// Klaipėda's latitude in a 96 pixel square.
export const CLOSE_ZOOM = 15;

export const DealCornerMap = ({ lat, lon, name = "", size = 96, onTap = null }) => {
  const holder = useRef(null);
  const map = useRef(null);
  const tap = useRef(onTap);
  tap.current = onTap;
  const ok = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));

  useEffect(() => {
    if (!ok || !holder.current || typeof IntersectionObserver === "undefined") return undefined;
    const at = [Number(lat), Number(lon)];
    let gone = false;
    const build = async () => {
      let L;
      try { L = (await import("leaflet")).default; } catch { return; }
      if (gone || map.current || !holder.current) return;
      const m = L.map(holder.current, {
        zoomControl: false, dragging: false, touchZoom: false, scrollWheelZoom: false,
        doubleClickZoom: false, boxZoom: false, keyboard: false, attributionControl: true,
        fadeAnimation: false, zoomAnimation: false,
      });
      m.attributionControl?.setPrefix(false);
      m.setView(at, CLOSE_ZOOM);
      addTileLayer(L, m);
      L.marker(at, {
        interactive: false, keyboard: false,
        icon: L.divIcon({
          className: "gemlyx-deal-pin",
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${C.gold};border:3px solid #0A0F1E;box-shadow:0 0 0 3px ${C.gold}55,0 2px 6px rgba(0,0,0,.6)"></div>`,
          iconSize: [14, 14], iconAnchor: [7, 7],
        }),
      }).addTo(m);
      m.on("click", () => tap.current?.());
      map.current = m;
      requestAnimationFrame(() => m.invalidateSize());
    };
    const seen = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { seen.disconnect(); build(); }
    }, { rootMargin: "300px 0px" });
    seen.observe(holder.current);
    return () => {
      gone = true;
      seen.disconnect();
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, [ok, lat, lon]);

  if (!ok) return null;
  return (
    <div ref={holder} data-testid="deal-corner-map" role={onTap ? "button" : undefined} aria-label={name}
      className="gemlyx-deal-map"
      style={{ width: size, height: size, flex: "0 0 auto", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.gold}55`, background: "#0A0F1E", cursor: onTap ? "pointer" : "default" }} />
  );
};

export default DealCornerMap;
