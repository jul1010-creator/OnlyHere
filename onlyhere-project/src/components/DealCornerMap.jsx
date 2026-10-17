// ── A SMALL MAP IN THE CORNER OF A DEAL ─────────────────────────────
//
// Oliver, 13 Oct 2026: "Put maps on them in the corner", then "a permanent
// closure of where it is located", then, of the OpenFreeMap tiles it was drawn
// with: "The openstreetmaps is very poorly designed. We need a static 'map' of
// the area in Klaipeda. Look at our map in the tourism guide.. use that."
//
// So it is the walk's own map: Google's, fixed on the street the place is on,
// with the same gold pin. A picture and not a control: nothing on it moves, so
// the page scrolls under a thumb, and tapping it does what "Walk there" does.
//
// ── DARK SINCE 16 OCT 2026 ─────────────────────────────────────────
// It was drawn in the guide's light style (the Map ID in
// utils/googleMapsLoader.js) until a design review of the page called the
// bright maps the one thing breaking its dark look, and Oliver said "try out
// the ideas that google and you agreed on". It now takes the dark style in
// utils/cardMapStyle.js, the picture and the live map alike. The walk map and
// the place view keep the guide's style.
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
import { GOOGLE_MAPS_BROWSER_KEY, googleMapsReady, loadGoogleMaps } from "../utils/googleMapsLoader";
import { CARD_MAP_STYLE, staticStyleParams } from "../utils/cardMapStyle";
import { PLACE_PIN, placePinHtml } from "./GoogleWalkMap";

// The street and the few around it: "zoom a bit out of the maps" (Oliver,
// 13 Oct 2026). 16 showed one block; 15 shows where in the Old Town it is.
export const CLOSE_ZOOM = 15;
// The guide's own pointer, a little smaller to suit a thumbnail ("put better
// pointers on the maps", same day). Its tip is on the place.
export const PIN_SCALE = 0.78;

export const staticMapUrl = ({ lat, lon, size, zoom = CLOSE_ZOOM }) =>
  `https://maps.googleapis.com/maps/api/staticmap?center=${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}&zoom=${zoom}&size=${size}x${size}&scale=2&${staticStyleParams()}&key=${encodeURIComponent(GOOGLE_MAPS_BROWSER_KEY)}`;

// Set on the first refusal, for this visit.
let staticRefused = false;
// ── A REFUSED PICTURE SHOWS THE SIGN, NOT A LIVE MAP ──────────────
// Security review, 17 Oct 2026: after one refused picture every tile became a
// live Maps JavaScript map, which costs more per view, so a daily quota on
// Static Maps alone moved the bill instead of capping it. Now a refused
// picture shows the place's sign on a quiet ground, like a tile with no map.
// The live map's code stays; true here brings it back.
export const LIVE_FALLBACK = false;

// `fill` makes it the picture of a deal tile (13 Oct 2026, Lidl Plus style):
// as wide as the tile, at `ratio`, asking Google for a picture big enough.
// `ask` is how big a picture to ask Google for when it fills a smaller box,
// and `pinScale` shrinks the pointer to suit it: the map in a photo tile's
// corner (16 Oct 2026) is a thumbnail, not a tile, so it also comes in one
// step closer (`zoom`), where 15 left a small square nearly empty.
export const DealCornerMap = ({ lat, lon, name = "", size = 104, onTap = null, sign = "📍", photo = "", pin = "", fill = false, ratio = "1 / 1", radius = 14, ask = 0, pinScale = PIN_SCALE, zoom = CLOSE_ZOOM }) => {
  const px = fill ? (ask || 360) : size;
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
    if (!ok || !near || !live || !LIVE_FALLBACK || made.current || !holder.current) return undefined;
    let gone = false;
    (async () => {
      try {
        const maps = await loadGoogleMaps();
        const { Map } = await maps.importLibrary("maps");
        if (gone || made.current || !holder.current) return;
        made.current = true;
        new Map(holder.current, {
          styles: CARD_MAP_STYLE,
          center: { lat: Number(lat), lng: Number(lon) },
          zoom,
          renderingType: maps.RenderingType?.RASTER || "RASTER",
          disableDefaultUI: true, gestureHandling: "none", keyboardShortcuts: false, clickableIcons: false,
        });
      } catch { /* no map rather than a broken one */ }
    })();
    return () => { gone = true; };
  }, [ok, near, live, lat, lon, zoom]);

  if (!ok) return null;
  if (live && !LIVE_FALLBACK) {
    return (
      <div data-testid="deal-corner-sign" aria-label={name} role={onTap ? "button" : undefined} onClick={onTap || undefined}
        style={{ ...(fill ? { width: "100%", aspectRatio: ratio } : { width: size, height: size, flex: "0 0 auto" }), borderRadius: radius, background: `radial-gradient(circle at 50% 42%, ${C.border}, ${C.bg} 75%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fill ? 34 : 22, cursor: onTap ? "pointer" : "default" }}>
        <span aria-hidden="true">{sign}</span>
      </div>
    );
  }
  return (
    <div data-testid="deal-corner-map" role={onTap ? "button" : undefined} aria-label={name}
      onClick={onTap || undefined}
      style={{ position: "relative", ...(fill ? { width: "100%", aspectRatio: ratio } : { width: size, height: size, flex: "0 0 auto" }), borderRadius: radius, overflow: "hidden", border: fill ? "none" : `1px solid ${C.border}`, background: C.bg, cursor: onTap ? "pointer" : "default" }}>
      <div ref={holder} style={{ position: "absolute", inset: 0 }}>
        {near && !live && (
          <img src={staticMapUrl({ lat, lon, size: px, zoom })} alt="" width={px} height={px} data-testid="deal-corner-static"
            onError={() => { staticRefused = true; setLive(true); }}
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>
      {/* The walk map's own pointer, with the place's sign or photo in its
          window, its tip on the place at the middle of the map. */}
      <div aria-hidden="true" data-testid="deal-corner-pin"
        style={{ position: "absolute", left: "50%", top: "50%", width: PLACE_PIN.w, height: PLACE_PIN.h, marginLeft: -PLACE_PIN.w / 2, marginTop: -PLACE_PIN.h, transform: `scale(${pinScale})`, transformOrigin: "50% 100%", filter: "drop-shadow(0 3px 5px rgba(0,0,0,.45))", pointerEvents: "none" }}
        dangerouslySetInnerHTML={{ __html: placePinHtml({ sign, photo, color: pin }) }} />
    </div>
  );
};

export default DealCornerMap;
