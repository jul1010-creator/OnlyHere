# The maps: what was actually wrong, and what I fixed

Updated 5 Aug 2026, after Oliver gave explicit permission to fix this inside guide code.

## First, a correction to what I told you earlier

In my first pass I said the guide map was drawing a 324 km OpenRouteService line around the Great Belt next to text saying 3h16. **That was wrong, and I should have read the map component before saying it.**

What the map actually did was draw one dashed straight line through every stop. It never called OpenRouteService at all. `api/route.js` exists but nothing in `src/` calls it, so it is dead code, same as `api/gemini.js`.

The API-level divergence I measured between Google and OpenRouteService is real, and the numbers below are real, but it had no effect on anything a user saw, because nothing was calling OpenRouteService. I built a conclusion on top of a measurement without checking whether the thing I was measuring was even wired up. That is the same mistake as claiming something is fixed without testing it.

## What was actually wrong

Your words: "It shouldn't be difficult to make a route…"

The map was not making a route. It was joining dots. `L.polyline(latlngs, { dashArray: "1,8" })` drew one straight dashed line through the day's stops, so a day with real travel in it showed a line cutting across water, farmland and whatever else happened to lie between two points. That reads as broken because, as a route, it is.

## What the API check found

The Maps API itself is fine. Live calls against the deployed site:

| Call | Result |
|---|---|
| `/api/directions` Copenhagen to Aarhus, transit | 200 · 3 hours 19 mins · 322 km |
| `/api/directions` Copenhagen to Sælvig Ferry Terminal, transit | 200 · 7 hours 48 mins · 384 km |
| `/api/directions` Copenhagen to Samsø, driving | 200 · 3 hours 16 mins · 145 km |
| `/api/weather` | 200 · real forecast |

`GOOGLE_MAPS_KEY` is set. No auth errors, no quota errors, no 500s.

**Gemini's Trap 1 is wrong.** It said routing to "Sælvig Ferry Terminal" would break the API because no trains cross the sea. That exact call returns 7h48 / 384 km, no error. Google handles the ferry leg without being told to. Gemini gives you confident, specific, well-formatted claims about your system that it has not tested and cannot test. Its content catches keep being right. Its technical predictions need checking.

**Gemini's Trap 2 is right, but it is a writing bug.** From Copenhagen you would not drive to Hou. Google already knows: Copenhagen to Samsø by car is 145 km / 3h16, which IS the Kalundborg to Ballen route. The API routed it correctly and the draft text went the wrong way on its own.

## The fix

**Legs are now drawn from their real geometry.** `/api/directions` returns Google's own route polyline alongside the duration, and the map draws that.

Coming from the same endpoint is the whole point. Whatever draws the line and whatever states the time have to describe the same journey. If I had pulled geometry from OpenRouteService instead, the two would have contradicted each other on exactly the routes that matter most here:

| Journey | Google | OpenRouteService | Gap |
|---|---|---|---|
| Copenhagen to Roskilde (land) | 38 min / 34.7 km | 36 min / 34.9 km | agree |
| Copenhagen to Ribe (land) | 3h13 / 282 km | 3h06 / 285.5 km | agree |
| Copenhagen to Ærøskøbing (ferry) | 3h46 / 193 km | 3h43 / 220.8 km | +14% km |
| Copenhagen to Aarhus (ferry or bridge) | 3h08 / 189 km | 3h12 / 305.9 km | +62% km |
| Copenhagen to Samsø (ferry) | 3h16 / 145 km | 4h48 / 324 km | +123% km, 92 min |

On land they agree within a percent or two. Over water they come apart, because OpenRouteService drives around where Google takes the boat. Using Google for both makes that whole class of contradiction impossible by construction, rather than something to detect and paper over.

**Each leg is drawn separately, and the mode is the leg's real mode.** A ferry crossing and a walk between the same two points are different journeys, so the map resolves each leg's mode with the same `resolveLegMode` call and same-town-walk override that the leg chip already uses. Sharing the resolution rather than re-deriving it is what stops the line and the stated duration from drifting apart.

**When it cannot get a real route, the leg keeps its dashed straight line.** A dashed line reads as "roughly this way". The map never invents a route it did not receive. A leg whose two stops resolved to the same point is skipped rather than fetched, since that is the town-centre collapse that caused the "1 min walk that was really 30" bug and there is no leg there to draw.

**Bounds fit what is drawn, not just the markers.** A real route can swing well outside the box its endpoints make, and fitting to the markers alone would crop exactly the part that explains the journey.

## Nearest Station, relabelled

Your point: "if the nearest station is just a terminal and bus stop, then the 'station' just gotta be changed to terminal and bus stop."

The At a Glance row was hardcoded to 🚆 Nearest Station for every content type, so "Sælvig Ferry Terminal" appeared under a train icon and the word Station. The value was true and the label was not, which is the kind of small wrongness that leaves someone on a quay looking for a platform.

`arrivalRow()` now labels the row for what the value actually is: ⛴ Nearest Terminal, 🚌 Nearest Bus Stop, ✈️ Nearest Airport, 🚇 Nearest Metro, or 🚆 Nearest Station. It reads the value and never rewrites it. Ferry wins over bus wins over train, so "Bus to Sælvig Ferry Terminal" is a terminal. Danish and English terms both, since published entries use both: havn, færge, rutebilstation, lufthavn.

## Still yours to fix, in Studio

The Samsø entry has two real content errors, and no code change touches them:

- `gettingThereReality` tells a Copenhagen reader to drive to Hou. From Zealand it is Kalundborg to Ballen. Hou is right from Aarhus and Jutland.
- `nearestStation` says "Sælvig Ferry Terminal". It now labels correctly as a terminal, but something like "Kalundborg (then ferry)" would be more useful to someone starting on Zealand.

## What is verified and what is not

Verified: the polyline decoder against Google's own published test vector, which it matches exactly. The arrival labels against 16 real and edge-case values. The drawing logic rendered in a real browser with real road geometry, one solid leg and one dashed fallback, screenshotted.

**Not verified: the live `/api/directions` response with the new `polyline` field**, because that endpoint only exists on your deployed site and the change is not deployed yet. The decoder is proven and the client handles a missing or unusable polyline by falling back to the dashed line, so the failure mode is the old behaviour rather than a broken map. Worth one look at a guide day after you push.
