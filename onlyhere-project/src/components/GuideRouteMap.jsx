import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { addTileLayer } from "../utils/mapTiles";
import { C } from "../utils/theme";
import { departureParam } from "../utils/helpers";
import { clusterPins, clusterBounds, clusterLabel, clusterHint } from "../utils/mapStops";

// ── REAL ROUTE GEOMETRY ────────────────────────────────────────────
// Oliver, 5 Aug 2026: "It shouldn't be difficult to make a route…", with
// explicit permission to fix this inside guide code.
//
// This map used to draw ONE dashed straight line through every stop. That is
// not a route, it is a join-the-dots, and on any day with real travel in it
// the line cut across water and countryside that nothing actually crosses.
//
// Now each leg is fetched from /api/directions, the SAME endpoint that
// produces the duration shown on that leg's chip, and drawn as its real shape.
// Same endpoint is the whole point: whatever draws the line and whatever
// states the time have to describe the same journey. Measured on the live site
// first, Google and OpenRouteService agree within 1-2% on land but come apart
// completely over water (Copenhagen to Samsø: 145 km one way, 324 km the
// other), so pulling geometry from a second service would have quietly
// reintroduced exactly that contradiction.
//
// WHAT HAPPENS WHEN IT CANNOT GET A REAL ROUTE, which is the part that keeps
// this honest: the leg keeps its old dashed straight line. A dashed line
// clearly reads as "roughly this way" rather than pretending to be a road.
// The map never invents a route it did not receive.
const geometryCache = new Map();   // module-level: outlives remounts, same discipline as liveContent

const legKey = (from, to, mode) => `${from[0].toFixed(4)},${from[1].toFixed(4)}|${to[0].toFixed(4)},${to[1].toFixed(4)}|${mode}`;

const fetchLegGeometry = async (from, to, mode) => {
  const key = legKey(from, to, mode);
  if (geometryCache.has(key)) return geometryCache.get(key);
  const promise = (async () => {
    try {
      // Same departure anchor as the duration lookups. Without it a transit leg's
      // GEOMETRY would describe a different departure than its stated time, which
      // reintroduces exactly the line-and-number drift this component was fixed for.
      const res = await fetch(`/api/directions?origin=${from[0]},${from[1]}&destination=${to[0]},${to[1]}&mode=${encodeURIComponent(mode)}${departureParam(mode)}`);
      const data = await res.json();
      return Array.isArray(data?.polyline) && data.polyline.length > 1 ? data.polyline : null;
    } catch { return null; }
  })();
  // Cache the PROMISE, not the result: two day cards mounting at once must
  // share one request rather than racing to make the same call twice.
  geometryCache.set(key, promise);
  return promise;
};

// Above this many stops the map stops shouting every name at once.
const LABEL_LIMIT = 6;

// ── THE LABEL CSS LIVES HERE NOW ────────────────────────────────────
// .gemlyx-map-label was only ever defined in App.jsx's inline <style>. Open a
// shared guide link cold and GuidePage mounts without it, so the tooltip renders
// unstyled: default Leaflet white box, black text, on exactly the routes with more
// than six points where the tooltip is the ONLY place a pin's name exists.
// Injected by the component that uses it, once, so it cannot go missing again.
const MAP_CSS = `
.gemlyx-map-label{background:${C.surface};color:${C.text};border:1px solid ${C.border};border-radius:8px;
  padding:3px 8px;font:700 11px 'Inter',sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.45);white-space:nowrap}
.gemlyx-map-label::before{border-top-color:${C.border}}
.gemlyx-near-label{background:transparent;color:${C.light};border:0;box-shadow:none;
  font:600 10px 'Inter',sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.9)}
.gemlyx-near-label::before{display:none}
`;

// Whether zooming in further could ever pull these apart: is there room left on
// the zoom scale, and is the box big enough for that room to matter. Both, so a
// pair at the same coordinate is caught wherever the reader happens to be.
const separable = (points, map) => {
  const box = clusterBounds(points);
  if (!box) return false;
  const room = (map.getMaxZoom?.() ?? 19) - map.getZoom();
  const span = Math.max(Math.abs(box[1][0] - box[0][0]) * 111, Math.abs(box[1][1] - box[0][1]) * 62);
  return room >= 1 && span > 0.03;   // 30 metres, roughly a pin's width on the ground
};

export const GuideRouteMap = ({ points, legs, nearby = [], onSelect = null, selectedName = "" }) => {
  const holderRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const didFitRef = useRef(false);
  // The secondary layer of our own nearby places, redrawn on every zoom and pan.
  const nearLayerRef = useRef(null);
  // ── THE STOP PINS, WHICH NOW DEPEND ON THE ZOOM ─────────────────────
  //
  // Oliver, 5 Sep 2026: "If something is on top of oneanother, then when you
  // click it, you should zoom down towards them all."
  //
  // Which pins overlap is a question about the SCREEN, so it has a different
  // answer at every zoom level and the layer has to be redrawn when the zoom
  // changes. It used to be drawn once, inside the fit, which is why a starburst
  // of stacked pins at Tønder stayed a starburst however far in you went.
  const pinLayerRef = useRef(null);
  // Where the map was before it flew down to a pin, so closing the card can put
  // it back. "And when you click out of it, you zoom out again."
  const beforeFlyRef = useRef(null);
  // The pending invalidateSize frame, so unmount can cancel it. See the note at
  // the requestAnimationFrame call below.
  const rafRef = useRef(null);
  // One entry per leg: the real polyline, or null once we know there isn't one.
  const [geometry, setGeometry] = useState({});

  // Fetch each leg's real shape. Deliberately separate from the drawing effect
  // so a slow or failed lookup never delays the map appearing: the dashed
  // fallback renders immediately and each leg upgrades itself as it arrives.
  useEffect(() => {
    if (!points || points.length < 2) return;
    let alive = true;
    points.slice(0, -1).forEach((p, i) => {
      const a = [p.lat, p.lon], b = [points[i + 1].lat, points[i + 1].lon];
      const mode = legs?.[i]?.mode || "driving";
      // Two stops that resolved to the same point have no leg to draw. This is
      // the town-centre collapse that caused the "1 min walk that was really 30"
      // bug; here it would just be a wasted API call.
      if (Math.abs(a[0] - b[0]) < 0.0002 && Math.abs(a[1] - b[1]) < 0.0002) return;
      fetchLegGeometry(a, b, mode).then(poly => {
        if (alive) setGeometry(prev => (prev[legKey(a, b, mode)] === poly ? prev : { ...prev, [legKey(a, b, mode)]: poly }));
      });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points), JSON.stringify(legs)]);

  useEffect(() => {
    if (!holderRef.current || points.length < 2) return;
    if (!mapRef.current) {
      const map = L.map(holderRef.current, { zoomControl: false, dragging: true, scrollWheelZoom: false }).setView([points[0].lat, points[0].lon], 8);
      // ── THE BASEMAP IS A CHOICE, MADE IN ONE PLACE ──────────────
      // Oliver, 18 Aug 2026, with the Stamen Watercolor endpoint in hand: "so
      // where do I put this then?" Here, and in two other components, each with
      // its own maxZoom and its own attribution — so it lives in
      // utils/mapTiles.js now and all three read it. See that file for why a
      // basemap is three properties rather than a URL, and in particular why
      // the dark inversion filter must not run over painted tiles.
      //
      // "chart" on the guide, because this is the map a traveller keeps. The
      // Studio map and the little map on a place page stay dark.
      addTileLayer(L, map, "chart");
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
      // The frame is CANCELLED on unmount and the callback reads mapRef rather
      // than the `map` it closes over. Both matter, for the same reason: this
      // schedules work for the next frame against a Leaflet instance that the
      // unmount effect below may destroy first. map.remove() nulls the
      // container, and invalidateSize() then reads a size off nothing and
      // throws. An uncaught error out of a rendered guide, from a map the
      // reader never even saw.
      //
      // The window is one frame wide, so it needs a guide page that unmounts
      // within ~16ms of a day card mounting: a fast back tap, a re-render that
      // swaps the route, a saved guide opened and closed. Rare, not impossible,
      // and invisible in development because StrictMode's double mount happens
      // to run the cleanup before the frame fires.
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (mapRef.current) mapRef.current.invalidateSize();
      });
    }
    const map = mapRef.current;
    map.invalidateSize();
    if (layerRef.current) { layerRef.current.remove(); }
    const group = L.layerGroup().addTo(map);
    layerRef.current = group;
    const latlngs = points.map(p => [p.lat, p.lon]);

    // Draw each leg separately, so one leg having a real route and the next one
    // not is drawn honestly rather than averaged into a single misleading line.
    // Solid = this is the actual route. Dashed = we could not get one, this is
    // only the direction of travel.
    const drawn = [];
    latlngs.slice(0, -1).forEach((a, i) => {
      const b = latlngs[i + 1];
      const mode = legs?.[i]?.mode || "driving";
      const poly = geometry[legKey(a, b, mode)];
      if (poly && poly.length > 1) {
        L.polyline(poly, { color: C.gold, weight: 3.5, opacity: 0.95, lineCap: "round", lineJoin: "round" }).addTo(group);
        drawn.push(...poly);
      } else {
        L.polyline([a, b], { color: C.gold, weight: 3, dashArray: "1,8", lineCap: "round", opacity: 0.85 }).addTo(group);
        drawn.push(a, b);
      }
    });
    // MORE TO SEE: numbered stop pins instead of anonymous dots, so the map
    // shows the ORDER of the day rather than just where things are, and the
    // first and last stop are visually distinct because "where I start" and
    // "where I end up" are the two a traveler actually looks for.
    //
    // ── AND THEY ARE REDRAWN WHENEVER THE ZOOM CHANGES ───────────
    //
    // Oliver, 5 Sep 2026: "If something is on top of oneanother, then when you
    // click it, you should zoom down towards them all."
    //
    // Whether two pins overlap is a fact about the SCREEN, so it has a different
    // answer at every zoom and the layer cannot be drawn once. His own screenshot
    // has a starburst at Tønder where two stops sit a few hundred metres apart at
    // national zoom: Leaflet draws the second on top of the first, a click can
    // only ever reach one of them, and nothing says the other is there.
    //
    // See utils/mapStops.js for the arithmetic, which is in screen pixels rather
    // than in kilometres because that is the actual question.
    const drawPins = () => {
      pinLayerRef.current?.remove();
      const layer = L.layerGroup().addTo(map);
      pinLayerRef.current = layer;
      clusterPins(points, map.getZoom()).forEach((cl) => {
        const first = cl.indexes[0];
        const p = cl.points[0];
        // ── A CLUSTER IS NOT A STOP AND IS NOT LABELLED AS ONE ────
        // It answers "why is there one dot where the list says three", and
        // opening it is the only thing it does. Numbering it would be a lie
        // about which stop a reader is looking at.
        if (cl.points.length > 1) {
          const n = cl.points.length;
          const cluster = L.marker([p.lat, p.lon], {
            riseOnHover: true,
            icon: L.divIcon({
              className: "gemlyx-stop-cluster",
              // The hint is the title attribute rather than a second tooltip: the
              // label says WHAT it is in two words and the hint says what
              // clicking does, and a map with two tooltips on one pin is a map
              // with a tooltip covering the next pin.
              html: `<div title="${clusterHint(n)}" style="width:30px;height:30px;border-radius:50%;background:${C.surface};color:${C.gold};`
                  + `font:800 12px 'Inter',sans-serif;display:flex;align-items:center;justify-content:center;`
                  + `border:2px solid ${C.gold};box-shadow:0 0 0 4px rgba(212,175,55,.18),0 2px 8px rgba(0,0,0,.6)">${n}</div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            }),
          }).bindTooltip(clusterLabel(n), { direction: "top", offset: [0, -17], className: "gemlyx-map-label" }).addTo(layer);
          cluster.on("click", () => {
            // Down to the box that holds them, not to a zoom number: two stops
            // 200 m apart and two 2 km apart need different answers and only the
            // bounds know which this is. maxZoom so a pair in one building does
            // not end up on a blank tile.
            const box = clusterBounds(cl.points);
            beforeFlyRef.current = beforeFlyRef.current || { center: map.getCenter(), zoom: map.getZoom() };
            // ── AND SOME CLUSTERS CANNOT BE SEPARATED AT ALL ────────
            //
            // Two stops at the SAME coordinate — a base returned to later in the
            // day, or two stops that both fell back to the middle of their town
            // — are one dot at every zoom there is. Flying to a zero-area box
            // lands at the tile layer's maximum, the cluster is redrawn
            // identically, and the pin is simply dead: no card, no way through,
            // and the caption under the map promising it separates them is a
            // lie. Opening the first one is worth more than a flight to nowhere.
            if (!box || !separable(cl.points, map)) {
              cluster.openTooltip();
              if (onSelect) onSelect(cl.points[0]);
              return;
            }
            map.flyToBounds(box, { padding: [70, 70], maxZoom: 17, duration: 0.8 });
          });
          return;
        }
        const i = first;
        const isFirst = i === 0, isLast = i === points.length - 1;
        const size = isFirst || isLast ? 26 : 22;
        const bg = isFirst ? "#4CAF50" : isLast ? C.accent : C.gold;
        // ── AN APPROXIMATE PIN LOOKS APPROXIMATE ────────────────────
        // A stop that could not be geocoded is plotted at the middle of its
        // town. Drawn identically to a real one, that pin is the map asserting
        // something nobody checked, in the place a reader trusts most. A dashed
        // ring and a hollow centre say "near here" at a glance, without needing
        // the note under the map to have been read. See tripPoints in
        // pages/GuidePage.jsx for where the flag comes from.
        const approx = !!p.approx;
        const icon = L.divIcon({
          className: "gemlyx-stop-pin",
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;`
              + `background:${approx ? "rgba(10,15,30,.72)" : bg};color:${approx ? bg : "#0A0F1E"};`
              + `font:700 ${isFirst || isLast ? 12 : 11}px 'Inter',sans-serif;display:flex;align-items:center;justify-content:center;`
              + `border:2px ${approx ? "dashed" : "solid"} ${approx ? bg : "#0A0F1E"};box-shadow:0 2px 6px rgba(0,0,0,.55);">${i + 1}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        // ── LABELS GO QUIET ON A LONG ROUTE ──────────────────────
        // Oliver, 7 Aug 2026, asking for one map across the whole trip instead
        // of one per day. Permanent tooltips were fine for a three stop day and
        // are unreadable at fourteen: the labels collide, overlap the line, and
        // hide the country the map exists to show. Above the threshold the
        // numbers carry the order (they match the stop list below) and a name
        // appears on hover or tap.
        const marker = L.marker([p.lat, p.lon], { icon, riseOnHover: true })
          .bindTooltip(p.name, {
            permanent: points.length <= LABEL_LIMIT,
            direction: "top",
            offset: [0, -(size / 2 + 2)],
            className: "gemlyx-map-label",
          })
          .addTo(layer);
        // ── CLICK A PIN AND FLY DOWN TO IT ──────────────────────
        // Oliver, 17 Aug 2026: "Can you make a design that when you click on one of
        // them, you instantly fly down to the area? And then it pops up in the right
        // corner where you read shortly about its location."
        //
        // The whole-trip map is the right default and it is unreadable up close:
        // Copenhagen to Billund in a 320 px box puts nine stops inside one pin's
        // worth of screen, which is why he could only read four numbers. Flying to a
        // single pin is the way out of that without giving up the overview, and 15
        // is the zoom where street names and the neighbours appear.
        //
        // flyTo, not setView: the animation is what tells a reader the map moved
        // rather than reloaded, and it is the difference between an overview and a
        // close-up feeling like one map or two.
        marker.on("click", () => {
          marker.openTooltip();
          // Remembered before the first flight and not overwritten by the second,
          // so closing the card returns to the whole route rather than to
          // wherever the last hop happened to leave it.
          beforeFlyRef.current = beforeFlyRef.current || { center: map.getCenter(), zoom: map.getZoom() };
          map.flyTo([p.lat, p.lon], 15, { duration: 0.85 });
          if (onSelect) onSelect(p);
        });
      });
    };
    drawPins();
    map.on("zoomend", drawPins);
    // ── AND OUR OWN PLACES, ONCE YOU ARE CLOSE ENOUGH TO CARE ────
    // Oliver: "Also make the map look a little more realistic. Having some of our
    // written tourism attractions written down. It's close to King's Garden. So
    // that could be shown on the map."
    //
    // Drawn small, unnumbered and only at zoom 13 and above, because at trip zoom
    // they would be exactly the blob the numbered pins already are. Zooming in is
    // the signal that somebody is looking at one area rather than the week.
    //
    // Every one of these is a row he published, plotted from ITS OWN stored
    // coordinate. Nothing here is a place a model thought was nearby. His own note
    // on the example was "(I obviously haven't written King's Garden in yet..)",
    // which is the point: this gets better as the library grows and says less until
    // then, and it never says anything untrue.
    const drawNearby = () => {
      const z = map.getZoom();
      nearLayerRef.current?.remove();
      nearLayerRef.current = null;
      if (z < 13 || !Array.isArray(nearby) || !nearby.length) return;
      const bounds = map.getBounds();
      const near = L.layerGroup();
      nearby
        .filter(r => Number.isFinite(r?.lat) && Number.isFinite(r?.lon))
        .filter(r => bounds.contains([r.lat, r.lon]))
        .slice(0, 12)
        .forEach(r => {
          L.marker([r.lat, r.lon], {
            icon: L.divIcon({
              className: "gemlyx-near-pin",
              html: `<div style="width:8px;height:8px;border-radius:50%;background:${C.light};opacity:.85;`
                  + `border:1px solid rgba(0,0,0,.5);box-shadow:0 1px 4px rgba(0,0,0,.6)"></div>`,
              iconSize: [8, 8],
              iconAnchor: [4, 4],
            }),
            interactive: false,
            keyboard: false,
          })
            .bindTooltip(r.name, { permanent: true, direction: "right", offset: [6, 0], className: "gemlyx-near-label" })
            .addTo(near);
        });
      near.addTo(map);
      nearLayerRef.current = near;
    };
    drawNearby();
    map.on("zoomend moveend", drawNearby);

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
    // Fit to what is actually DRAWN, not just to the stop markers. A real route
    // can swing well outside the box its two endpoints make (a ferry crossing,
    // a motorway going the long way round a fjord), and fitting to the markers
    // alone would crop exactly the part that explains the journey.
    // ── "ODENSE IS NOT ON THE MAP AT ALL" ────────────────────
    // Oliver, 9 Aug 2026, on a route reading Copenhagen to Borre to Odense:
    // "the map looks so akward at start.. everything just messed into a small
    // area". The screenshot is worse than awkward. There is a stacked cluster
    // over Kobenhavn, one pin half off the left edge, and Odense, which is
    // 135 km west and named in the route line directly above the map, is not
    // in frame.
    //
    // This line was `drawn.length > 1 ? drawn : latlngs`, an EITHER/OR. The
    // intent was right and is worth keeping: a real route can swing well
    // outside the box its two endpoints make, so fitting to the markers alone
    // crops the part that explains the journey. But choosing `drawn` INSTEAD
    // of the markers means any stop the drawn geometry does not happen to
    // cover falls outside the fit, and a fit that leaves out a stop is a map
    // that has quietly lost one.
    //
    // The union is what was meant. Every marker is guaranteed in frame, and
    // the route's real detours still widen the box.
    const extent = [...latlngs, ...drawn];
    const lats = extent.map(p => p[0]), lons = extent.map(p => p[1]);
    const spreadKm = Math.max(
      (Math.max(...lats) - Math.min(...lats)) * 111.32,
      (Math.max(...lons) - Math.min(...lons)) * 62.06
    );
    // ANIMATED, not snapped (Oliver: "better animated more things to see on the
    // maps"). Leaflet jumps instantly by default, so a day map that re-fits when
    // its real route geometry arrives used to teleport. flyTo/flyToBounds eases
    // the pan and zoom together, which reads as the map settling rather than
    // flickering. `animate` is switched off on the very first fit, because
    // animating from the arbitrary initial view to the real one is just a long
    // swoop across Denmark nobody asked for.
    const firstFit = !didFitRef.current;
    didFitRef.current = true;
    // Leaflet works out a fitBounds zoom from the container size it has
    // CACHED, and it caches that at construction. This map is built inside a
    // card that is still settling (web fonts, the hero image above it), so the
    // very first fit could be computed against a size the container no longer
    // has, which lands as a view zoomed too far in and centred wrong. One call
    // costs nothing and removes the whole class.
    map.invalidateSize(false);
    if (spreadKm < 0.6) {
      const c = [lats.reduce((a, b) => a + b, 0) / lats.length, lons.reduce((a, b) => a + b, 0) / lons.length];
      if (firstFit) map.setView(c, 12);
      else map.flyTo(c, 12, { duration: 0.8, easeLinearity: 0.25 });
    } else if (firstFit) {
      map.fitBounds(extent, { padding: [44, 44], maxZoom: 14 });
    } else {
      map.flyToBounds(extent, { padding: [44, 44], maxZoom: 14, duration: 0.9, easeLinearity: 0.25 });
    }
    return () => {
      map.off("zoomend moveend", drawNearby);
      map.off("zoomend", drawPins);
      nearLayerRef.current?.remove();
      nearLayerRef.current = null;
      pinLayerRef.current?.remove();
      pinLayerRef.current = null;
      // A new route is a new overview, so the view saved from the old one is not
      // somewhere to go back to.
      beforeFlyRef.current = null;
      group.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points), JSON.stringify(legs), geometry, JSON.stringify(nearby)]);

  // ── AND CLICKING OUT ZOOMS BACK OUT ─────────────────────────────────
  //
  // Oliver, 5 Sep 2026: "And when you click out of it, you zoom out again."
  //
  // Closing the card used to close a card. The map stayed at zoom 15 over
  // whichever pin had been opened, so a reader who wanted the route back had to
  // find the minus button and guess how far. The view is captured on the way
  // down and restored on the way out, which is what makes the two feel like one
  // map rather than a page that navigated.
  //
  // Driven by the SELECTION rather than by the close button, so dismissing the
  // card any other way — a second click, an escape, the parent clearing it —
  // comes back the same way. The card is the parent's state; the flight is not
  // something the parent should have to remember to undo.
  useEffect(() => {
    if (selectedName) return;
    const map = mapRef.current;
    const back = beforeFlyRef.current;
    if (!map || !back) return;
    beforeFlyRef.current = null;
    map.flyTo(back.center, back.zoom, { duration: 0.8, easeLinearity: 0.25 });
  }, [selectedName]);
  useEffect(() => () => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
  }, []);
  if (points.length < 2) return null;
  return (
    <>
      <style>{MAP_CSS}</style>
      <div ref={holderRef} style={{ width: "100%", height: "100%" }} />
    </>
  );
};

// Renders a real, official Instagram post/reel using Instagram's own embed
// widget (embed.js) — free, no API key or app review needed, since it's
// their sharing mechanism (same idea as embedding a tweet), not scraping
// or re-hosting someone else's video ourselves.
// Generic At-a-Glance card — works for any type by passing a list of
// {icon, label, value} rows. Replaces the old event-only hardcoded version
// so Towns and Attractions (Free Entrance + Booking) can use the exact same
// premium pattern instead of a bespoke one-off per type.