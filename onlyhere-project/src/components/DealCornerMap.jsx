// ── A SMALL MAP IN THE CORNER OF A DEAL, THAT ZOOMS DOWN ────────────
//
// Oliver, 13 Oct 2026, of the deals on the Klaipėda page: "Put maps on them
// in the corner.. so we get that zoom down that we made in the travel guide."
//
// The travel guide's map opens high and flies down to the place, because the
// flight is what tells you where something is (ChatMiniMap.jsx, "the map
// should start from up, and then zoom down", 6 Sep 2026). Same here, small:
// the map starts over the Baltic coast and flies down to the street the deal
// is on, the first time the card comes into view.
//
// A picture, not a control: nothing on it can be dragged or zoomed, so the
// page still scrolls under a thumb. Tapping it does what "Walk there" does.
//
// BUILT ONLY WHILE IT CAN BE SEEN. A dozen drawn maps on one page is a dozen
// WebGL canvases, and a phone gives a page only so many. So a map is made
// when its card scrolls near the screen and taken down when it scrolls far
// away; coming back it is drawn where it landed, without flying again.
//
// Leaflet is loaded when the first map is built rather than at import, because
// it reaches for `window` the moment it loads, and the helpers in
// DealsNearYou.jsx are read by the test suite with no window at all.
import { useEffect, useRef } from "react";
import { addTileLayer } from "../utils/mapTiles";
import { C } from "../utils/theme";

// High enough to see the coast and Klaipėda's place on it, low enough that
// the descent is short. Then the street.
export const FLY_FROM_ZOOM = 7;
export const LAND_ZOOM = 15;
export const FLY_SECONDS = 2.2;

const reducedMotion = () => {
  try { return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

export const DealCornerMap = ({ lat, lon, name = "", size = 96, delay = 0, onTap = null }) => {
  const holder = useRef(null);
  const map = useRef(null);
  const flown = useRef(false);
  const tap = useRef(onTap);
  tap.current = onTap;
  const ok = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));

  useEffect(() => {
    if (!ok || !holder.current || typeof IntersectionObserver === "undefined") return undefined;
    const at = [Number(lat), Number(lon)];
    let timer = null;
    let gone = false;
    let building = false;
    const build = async () => {
      if (map.current || building || !holder.current) return;
      building = true;
      let L;
      try { L = (await import("leaflet")).default; } catch { building = false; return; }
      building = false;
      if (gone || map.current || !holder.current || !wanted) return;
      const m = L.map(holder.current, {
        zoomControl: false, dragging: false, touchZoom: false, scrollWheelZoom: false,
        doubleClickZoom: false, boxZoom: false, keyboard: false, attributionControl: true,
      });
      m.attributionControl?.setPrefix(false);
      const first = flown.current || reducedMotion();
      m.setView(at, first ? LAND_ZOOM : FLY_FROM_ZOOM);
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
      if (!first) {
        timer = setTimeout(() => {
          if (map.current !== m) return;
          flown.current = true;
          m.flyTo(at, LAND_ZOOM, { duration: FLY_SECONDS });
        }, 250 + delay);
      }
    };
    let wanted = false;
    const drop = () => {
      wanted = false;
      clearTimeout(timer);
      if (map.current) { map.current.remove(); map.current = null; }
    };
    const seen = new IntersectionObserver((entries) => {
      for (const e of entries) { if (e.isIntersecting) { wanted = true; build(); } else drop(); }
    }, { rootMargin: "300px 0px" });
    seen.observe(holder.current);
    return () => { gone = true; seen.disconnect(); drop(); };
  }, [ok, lat, lon]);

  if (!ok) return null;
  return (
    <div ref={holder} data-testid="deal-corner-map" role={onTap ? "button" : undefined} aria-label={name}
      className="gemlyx-deal-map"
      style={{ width: size, height: size, flex: "0 0 auto", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.gold}55`, background: "#0A0F1E", cursor: onTap ? "pointer" : "default" }} />
  );
};

export default DealCornerMap;
