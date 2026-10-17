// ── THE PLACE, FROM ABOVE, WHEN ITS MAP IS TAPPED ───────────────────
//
// Oliver, 13 Oct 2026: "Make it, so when you click the map, you zoom down to
// show only the area and building of the place. Like the google earth frame
// from earlier. Then under the map, you can click 'show directions' with a
// tracked location from where you are currently."
//
// "The google earth frame" is the walk map's glide (GoogleWalkMap.jsx,
// focusStop): satellite, the camera tilting down over the real roofs onto the
// stop. Same here, for one place: it opens over the Old Town, glides down to
// the building, and then turns slowly round it until the visitor touches the
// map. Under it, Show directions starts the walk from where the phone is,
// followed by GPS (WalkMode.jsx).
//
// One Google map, made only when a visitor asks for it by tapping, so the
// page of deals costs nothing extra until somebody wants to look.
import { useEffect, useRef, useState } from "react";
import { C } from "../utils/theme";
import { t as uiT } from "../utils/uiLanguage";
import { GOOGLE_MAP_ID, googleMapsReady, loadGoogleMaps } from "../utils/googleMapsLoader";
import { PLACE_PIN, placePinHtml, glideAt } from "./GoogleWalkMap";

// Over the building, tilted the way the walk map arrives at a stop, a little
// closer because there is only one place to show.
export const PLACE_VIEW = { from: { zoom: 15, tilt: 0, heading: 0 }, to: { zoom: 18.5, tilt: 55, heading: 35 } };
export const PLACE_GLIDE_MS = 2400;
// Degrees a second while it turns round the building, and for how long.
export const TURN_DEG_PER_S = 3;
export const TURN_FOR_MS = 45000;

const reducedMotion = () => {
  try { return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

export const DealPlaceView = ({ lat, lon, name = "", sign = "📍", photo = "", pin = "", lang = "en", onDirections = null, onClose = null, height = 260 }) => {
  const box = useRef(null);
  const [failed, setFailed] = useState(false);
  // The deal's own pin colour; `pin` inside the effect is the marker element.
  const pinColor = pin;
  const ok = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) && googleMapsReady();

  useEffect(() => {
    if (!ok || !box.current) return undefined;
    let gone = false, raf = 0, touched = false;
    const el = box.current;
    const stop = () => { touched = true; if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    ["pointerdown", "wheel", "touchstart"].forEach(e => el.addEventListener(e, stop, { passive: true }));
    (async () => {
      try {
        const maps = await loadGoogleMaps();
        const { Map } = await maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await maps.importLibrary("marker");
        if (gone || !box.current) return;
        const at = { lat: Number(lat), lon: Number(lon) };
        const start = { ...at, ...PLACE_VIEW.from };
        const end = { ...at, ...PLACE_VIEW.to };
        const map = new Map(box.current, {
          mapId: GOOGLE_MAP_ID,
          center: { lat: at.lat, lng: at.lon }, zoom: start.zoom, tilt: start.tilt, heading: start.heading,
          renderingType: maps.RenderingType?.VECTOR || "VECTOR",
          mapTypeId: "satellite",
          disableDefaultUI: true, zoomControl: true, gestureHandling: "cooperative", clickableIcons: false,
        });
        const pin = document.createElement("div");
        pin.setAttribute("data-testid", "place-view-pin");
        pin.style.cssText = `position:relative;width:${PLACE_PIN.w}px;height:${PLACE_PIN.h}px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.45))`;
        pin.innerHTML = placePinHtml({ sign, photo, color: pinColor });
        pin.querySelector("img")?.addEventListener("error", (e) => { try { e.target.remove(); } catch { /* gone */ } });
        new AdvancedMarkerElement({ map, position: { lat: at.lat, lng: at.lon }, content: pin, title: name });
        const put = (cam) => map.moveCamera({ center: { lat: cam.lat, lng: cam.lon }, zoom: cam.zoom, tilt: cam.tilt, heading: cam.heading });
        // Then round the building, slowly, until the visitor takes over.
        const turn = () => {
          const t0 = performance.now();
          const step = (now) => {
            if (gone || touched) return;
            const ms = now - t0;
            put({ ...end, heading: (end.heading + (ms / 1000) * TURN_DEG_PER_S) % 360 });
            if (ms < TURN_FOR_MS) raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        };
        if (reducedMotion()) { put(end); return; }
        const t0 = performance.now();
        const step = (now) => {
          if (gone || touched) return;
          const t = (now - t0) / PLACE_GLIDE_MS;
          put(glideAt(start, end, t));
          if (t >= 1) { raf = 0; turn(); return; }
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      } catch { if (!gone) setFailed(true); }
    })();
    return () => {
      gone = true;
      if (raf) cancelAnimationFrame(raf);
      ["pointerdown", "wheel", "touchstart"].forEach(e => el.removeEventListener(e, stop));
    };
  }, [ok, lat, lon]);

  const btn = (primary) => ({
    flex: primary ? 1 : "0 0 auto", background: primary ? C.gold : "transparent", color: primary ? C.onGold : C.light,
    border: `1px solid ${primary ? C.gold : C.border}`, borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 700,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
  });

  if (!ok) return null;
  return (
    <div data-testid="place-view" style={{ marginTop: 12 }}>
      {failed ? (
        <div style={{ fontSize: 12.5, color: C.muted, padding: "10px 0" }}>{uiT("explore.mapFailed", lang)}</div>
      ) : (
        <div ref={box} aria-label={name} style={{ width: "100%", height, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}`, background: C.bg }} />
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {onDirections && (
          <button onClick={onDirections} data-testid="place-view-directions" style={btn(true)}>
            ▶ {uiT("explore.directions", lang)}
          </button>
        )}
        {onClose && (
          <button onClick={onClose} data-testid="place-view-close" style={btn(false)}>{uiT("explore.closeMap", lang)}</button>
        )}
      </div>
    </div>
  );
};

export default DealPlaceView;
