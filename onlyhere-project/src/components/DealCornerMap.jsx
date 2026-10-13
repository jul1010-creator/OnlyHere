// ── A SMALL MAP IN THE CORNER OF A DEAL ─────────────────────────────
//
// Oliver, 13 Oct 2026: "Put maps on them in the corner", then "a permanent
// closure of where it is located", then, of the OpenFreeMap tiles it was drawn
// with: "The openstreetmaps is very poorly designed. We need a static 'map' of
// the area in Klaipeda. Look at our map in the tourism guide.. use that."
//
// So it is the walk's own map: Google's, in the guide's style (the Map ID in
// utils/googleMapsLoader.js), fixed on the street the place is on, with the
// same gold pin. A picture and not a control: nothing on it moves, so the page
// scrolls under a thumb, and tapping it does what "Walk there" does.
//
// ── WHY A LIVE MAP AND NOT A PICTURE OF ONE ────────────────────────
// Google's Static Maps would be the cheaper picture, but the browser key is
// set to the Maps JavaScript API only (googleMapsLoader.js says why), and a
// static request with it is refused, checked on 13 Oct 2026. Saving a picture
// of Google's map into the site is against Google's terms. So each corner is a
// small Google map, still: no dragging, no zooming, no controls. Raster, not
// vector, so a dozen of them do not need a dozen WebGL canvases.
//
// Made when the card first comes near the screen, then kept. Without the key
// and a Map ID there is no map at all, rather than a worse one.
import { useEffect, useRef, useState } from "react";
import { C } from "../utils/theme";
import { GOOGLE_MAP_ID, googleMapsReady, loadGoogleMaps } from "../utils/googleMapsLoader";

// The street and a block or two around it.
export const CLOSE_ZOOM = 16;

export const DealCornerMap = ({ lat, lon, name = "", size = 104, onTap = null }) => {
  const holder = useRef(null);
  const made = useRef(false);
  const [shown, setShown] = useState(false);
  const ok = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) && googleMapsReady();

  useEffect(() => {
    if (!ok || !holder.current || typeof IntersectionObserver === "undefined") return undefined;
    let gone = false;
    const build = async () => {
      try {
        const maps = await loadGoogleMaps();
        const { Map } = await maps.importLibrary("maps");
        if (gone || made.current || !holder.current) return;
        made.current = true;
        new Map(holder.current, {
          mapId: GOOGLE_MAP_ID,
          center: { lat: Number(lat), lng: Number(lon) },
          zoom: CLOSE_ZOOM,
          renderingType: maps.RenderingType?.RASTER || "RASTER",
          disableDefaultUI: true, gestureHandling: "none", keyboardShortcuts: false, clickableIcons: false,
        });
        setShown(true);
      } catch { /* no map rather than a broken one */ }
    };
    const seen = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { seen.disconnect(); build(); }
    }, { rootMargin: "300px 0px" });
    seen.observe(holder.current);
    return () => { gone = true; seen.disconnect(); };
  }, [ok, lat, lon]);

  if (!ok) return null;
  return (
    <div data-testid="deal-corner-map" role={onTap ? "button" : undefined} aria-label={name}
      onClick={onTap || undefined}
      style={{ position: "relative", width: size, height: size, flex: "0 0 auto", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.gold}55`, background: "#0A0F1E", cursor: onTap ? "pointer" : "default" }}>
      <div ref={holder} style={{ position: "absolute", inset: 0 }} />
      {/* The guide's gold pin, on the place, over the map. It catches the tap
          too, so the map underneath never has to. */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: C.gold, border: "3px solid #0A0F1E", boxShadow: `0 0 0 3px ${C.gold}55, 0 2px 6px rgba(0,0,0,.6)`, opacity: shown ? 1 : 0.5 }} />
      </div>
    </div>
  );
};

export default DealCornerMap;
