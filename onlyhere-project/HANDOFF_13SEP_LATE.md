# Gemlyx, 13 Sep 2026, late

Suite **16,387 passing**, 0 failed, both timezones. Build clean. All on your PC.

> **RUN `npm install` FIRST.** Two new packages are in package.json and nothing
> will start without them. Everything else is already written over.

> **DO NOT PUSH UNTIL YOU HAVE LOOKED AT A MAP.** The basemap under every map in
> the app changed tonight and your pre-push hook only runs the suite, which
> cannot see a map. The checklist is at the bottom. Everything else here is safe
> and I would push it on its own.

---

## "Why would it not pin Ribe or something?"

Because Gemlyx never said Ribe, and the thing it did say cannot be pinned.

Your reply offered you **Haderslev**, which Gemlyx holds no entry for, so there
is no page, no photograph and no coordinate for it. The only name in that
sentence the app could find a coordinate for was **Copenhagen**, and it was in
there as the place you were NOT stopping at yet: "breaking the journey before
Copenhagen". So the map pinned the one town the reply was steering you past.

Ribe and Aabenraa were both on the lists handed to the model, and both on your
road up through South Jutland.

The prompt said to use the lists **only when building a day by day plan**. A
recommendation inside a conversation had no rule at all. So the model was free to
name any town in Denmark, and when it does, everything that makes this app
different switches off silently: no pin, no card under the reply, nothing to
open. The map then shows whichever other town happened to get mentioned.

There is a rule now, and it is deliberately not a gag order:

- Every place offered as somewhere to go comes off the lists.
- Answering about anywhere in Denmark is still the job.
- If the honest answer is a place Gemlyx does not hold, it names it AND says
  plainly there is no page for that one yet, then puts one from the lists beside
  it.

**Still open, and I did not do it**: Copenhagen would still get a pin in that
sentence, because it was named. A place named as a waypoint ("before X", "past
X", "on the way to X", "north of X") is a reference point rather than an offer,
and the map reads both the same way. That needs its own reader and I did not want
to write one at speed while you were out.

---

## The pin

You sent the photograph and asked if it was possible. It is, and it is better
than the dot I offered.

A glossy ball with a real specular highlight, a tapered steel needle with the
dark side facing away from the light, tilted 10 degrees so it reads as pushed in
rather than printed on, shadow falling down and to the right. All SVG, no image
files. **The needle tip is the anchor**, so the point is still exactly where the
place is, which is the half the teardrop already had right.

The numbers, after rendering it at 4x and at map size and looking:

- head 11px, and 15px for the newest place, which keeps size as the only
  difference rather than a second colour
- needle 2.1 head diameters, shorter than the real article's 2.7, because life
  size reads as a matchstick on a screen
- tilt 10 degrees

Each pin gets its own gradient ids. Without that every pin inherits the first
one's, which is one shared ball that never changes size, and it only shows up
once two pins differ.

---

## The basemap, and a decision I did not make for you

I measured all four from your live domain rather than trusting anybody's docs.

| | result |
|---|---|
| OSM, what ships today | works, and carries Agder, Kristiansand, Goteborg, Boras, Halmstad, Helsingborg and "Vastra Gotalands lan" across a Denmark trip |
| CARTO | **every tile watermarked "API KEY REQUIRED" diagonally across it.** I told you earlier it needed no key. That was wrong |
| Stadia alidade dark | loads clean from your domain, but their free tier says commercial use is not allowed, and the style is a light grey that does not sit in your navy |
| Stadia Watercolor, in your app now | loads. Same free-tier commercial question applies to it today |

None of those is both free and commercially allowed. So the answer is a fifth
one: **OpenFreeMap**. Their own words: "completely free: there are no limits on
the number of map views or requests", "no registration, no user database, no API
keys, and no cookies", commercial use allowed, attribution required. I confirmed
from your own domain that their style and a tile both return 200.

**What I did NOT do, on purpose: spend your money or register anything in your
name.** Stadia Starter is 20 USD a month and CARTO wants an Enterprise
conversation. Both are yours to decide, not mine, and neither is needed now.

OpenFreeMap serves vector tiles, so this needed MapLibre rather than Leaflet's
raster layer. It is wired through `maplibre-gl-leaflet` so it sits inside the
Leaflet maps you already have and every marker, tooltip and popup is untouched.
The style is ours: `src/utils/mapStyle.js`, 17 layers, **no labels at all**, dark
water and land in your own theme tokens, roads under 0.5 opacity so the gold
route wins. Denmark as a shape, and the only words on the map are your own town
chips.

The old inverted OSM raster is still there as the fallback, through the refusal
machinery `mapTiles.js` already had. A bad night at OpenFreeMap degrades to the
map you have today rather than to nothing.

**Bundle**: main went 709.69 to 713.97 kB gzipped, so pages without a map pay
4 kB. MapLibre is a lazy chunk, 279 kB gzipped plus a 147 kB worker, fetched once
by the first map in a session. Loaded statically it would have been plus 40
percent on every page, which I would not have shipped without asking.

The guide keeps its Watercolor map, which was your choice; navy is its fallback
now instead of the inverted raster.

---

## Before you push, open a map

The suite cannot see a map. These need your eyes, in this order:

1. **`npm install`**, then `npm run dev`.
2. **The Detour chat map draws**: dark navy, a readable coastline, no place
   names, pins and labels on top. Network tab: `tiles.openfreemap.org`, and no
   `tile.openstreetmap.org`.
3. **Denmark reads** at country zoom in the narrow rail. The land against water
   contrast is calculated, not looked at. If the islands vanish, `LAND` and
   `COAST` in `mapStyle.js` are the two values to nudge.
4. **The pins**: the marking pin on the map, tip on the coordinate, the newest
   one bigger, labels not colliding.
5. **Pan, zoom, a beat flying to a town, the fly back.**
6. **Phone**: the 190px strip, and WebGL2 is required, so iOS 15 or newer.
7. **Attribution renders** on all four maps. It is a licence condition.
8. **The fallback**: block `tiles.openfreemap.org` in devtools and confirm the
   old map appears with a console line naming the refusal.

If 2 or 3 look wrong, the whole basemap change is one revert: put `dark` back as
the default in `mapTiles.js`. Nothing else tonight depends on it.

---

## Still open

1. **The exclusion path on the build.** `_constraints.excluded` never reaches the
   build prompts. Still the biggest one.
2. A place named as a waypoint is pinned as an offer. See above.
3. The promise gate: nothing compares what the chat promised against the plan.
4. 170 em dashes left in strings, most of them inside prompts that themselves
   forbid the em dash.
5. Three readers of transport disagree; "1 week and 2 days" reads as 2 days.
6. From the events audit, three decisions still yours: should a failed correction
   block publishing, should the untraced-price rule widen to food, and a Studio
   line showing how long since the last events run.
