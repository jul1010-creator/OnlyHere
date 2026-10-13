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
// ── A PICTURE FIRST, A LIVE MAP IF GOOGLE SAYS NO ──────────────────
// Google's Static Maps is the cheap way: one picture per card, in the same
// style. It needs "Maps Static API" in the browser key's own list of allowed
// APIs in Google Cloud (Credentials, the key, API restrictions). On 13 Oct 2026
// Google answered "This API key is not authorized to use this service or
// API", so until that is ticked the picture fails and the card falls back to
// a small live Google map, which costs more per view. The first refusal is
// remembered for the rest of the visit, so a page of twelve cards asks once.
// When the tick is in, the pictures come back by themselves.
//
// The picture is Google's own and is never saved into the site: storing it
// would break Google's terms.
import { useEffect, useRef, useState } from "react";
import { C } from "../utils/theme";
import { GOOGLE_MAP_ID, GOOGLE_MAPS_BROWSER_KEY, googleMapsReady, loadGoogleMaps } from "../utils/googleMapsLoader";

// The street and a block or two around it.
export const CLOSE_ZOOM = 16;

export const staticMapUrl = ({ lat, lon, size }) =>
  `https://maps.googleapis.com/maps/api/staticmap?center=${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}&zoom=${CLOSE_ZOOM}&size=${size}x${size}&scale=2&map_id=${encodeURIComponent(GOOGLE_MAP_ID)}&key=${encodeURIComponent(GOOGLE_MAPS_BROWSER_KEY)}`;

// Set on the first refusal, for this visit.
let staticRefused = false;

export const DealCornerMap = ({ lat, lon, name = "", size = 104, onTap = null }) => {
  const holder = useRef(null);
  const made = useRef(false);
  const [live, setLive] = useState(staticRefused);
  const [near, setNear] = useState(false);
  const ok = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) && googleMapsReady();

  // Nothing is asked of Google until the card comes near the screen.
  useEffect(() => {
    if (!ok || !holder.current || typeof IntersectionObserver === "undefined") return undefined;
    const seen = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { seen.disconnect(); setNear(true); }
    }, { rootMargin: "300px 0px" });
    seen.observe(holder.current);
    return () => seen.disconnect();
  }, [ok]);

  // The live map, only when the picture was refused.
  useEffect(() => {
    if (!ok || !near || !live || made.current || !holder.current) return undefined;
    let gone = false;
    (async () => {
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
      } catch { /* no map rather than a broken one */ }
    })();
    return () => { gone = true; };
  }, [ok, near, live, lat, lon]);

  if (!ok) return null;
  return (
    <div data-testid="deal-corner-map" role={onTap ? "button" : undefined} aria-label={name}
      onClick={onTap || undefined}
      style={{ position: "relative", width: size, height: size, flex: "0 0 auto", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.gold}55`, background: "#0A0F1E", cursor: onTap ? "pointer" : "default" }}>
      <div ref={holder} style={{ position: "absolute", inset: 0 }}>
        {near && !live && (
          <img src={staticMapUrl({ lat, lon, size })} alt="" width={size} height={size} data-testid="deal-corner-static"
            onError={() => { staticRefused = true; setLive(true); }}
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>
      {/* The guide's gold pin, on the place, over the map. */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: C.gold, border: "3px solid #0A0F1E", boxShadow: `0 0 0 3px ${C.gold}55, 0 2px 6px rgba(0,0,0,.6)` }} />
      </div>
    </div>
  );
};

export default DealCornerMap;
