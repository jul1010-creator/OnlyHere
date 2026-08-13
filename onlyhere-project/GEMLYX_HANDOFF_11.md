# Handoff 11 — regions, maps first, and what a 2017 page may not say

## 13 August 2026

Your two notes from work, plus the one you sent mid-session:

> *"We need to have regions of Denmark in 'specific' regions. So I can put
> 'visitsønderjylland.dk' as a source for Sønderjylland."*
>
> *"So when doing research, make maps be one of the first things to be searched,
> so tavily/perplexity will know which area to search."*
>
> *"I noticed a source about Esbjerg was taken from 2017... If such a source
> starts talking about a restaurant that no longer exists, then that can become
> an issue."*

    Suite      3501 passing, 0 failing   (was 3386)
    Mutations  21 run, every one red before its commit
    Build      vite build clean
    Files      9 changed or added, listed at the bottom

**Everything is written to your disk. Nothing is pushed.**

---

## 1. Regions

### The gap you found is real, and it had no tier

The source panel scopes a source two ways: a TOWN, or one of five landmasses.
Neither answers you.

    Scoped to Jutland      VisitSønderjylland rides along on a Skagen draft,
                           three hundred kilometres north
    Scoped to Tønder       fires on Tønder and nothing else. Not Sønderborg,
                           not Aabenraa, not Haderslev, not Rømø, not
                           Møgeltønder, and not on whatever you publish down
                           there next month

One row per town is not a scope, it is a chore that falls behind silently.

### A region is a list of kommuner, not a shape I drew

Destination Sønderjylland's own site names the four kommuner it covers:
**Haderslev, Aabenraa, Sønderborg, Tønder**. That sentence *is* the border. A
polygon drawn by eye would be my approximation of it, wrong by some kilometres
along the Kongeå, with nothing anywhere saying so.

So `src/data/kommuner.js` holds all 99 kommuner from
**api.dataforsyningen.dk**, the Danish state's own address register: the
"visuelt center" (a point the register guarantees is *inside* the kommune, which
a centroid is not for the several shaped like a C) and the bounding box.

**Twelve regions**, covering Jutland and Zealand:

    Nordjylland  Vestjylland  Midtjylland  Østjylland  Djursland
    Sydvestjylland  Sydøstjylland  Sønderjylland
    Nordsjælland  Storkøbenhavn  Midt- og Vestsjælland  Sydsjælland og Møn

Funen, Lolland-Falster and Bornholm get **no** subdivision on purpose. The
landmass already covers them and VisitFyn covers the whole island. Inventing
"Nordfyn" would be a filter offering an empty room, which the towns page shipped
once already.

One name clash, stated rather than hidden: **Midtjylland here means the middle
of Jutland** (Viborg, Skive, Silkeborg, Herning, Ikast-Brande). Region
Midtjylland, the administrative one, also contains Aarhus, Randers and the whole
west coast, and nobody standing in Aarhus says they are in Midtjylland.

### The bbox is why the border is right

Nearest-centre alone is a Voronoi diagram over points, and Danish kommuner are
nowhere near equal in size. Measured: pure Voronoi puts the Sønderjylland line
about **fifteen kilometres south of the Kongeå**, which files Christiansfeld
under the wrong tourist board. Filtering by bounding box first fixes it, because
a bbox is data rather than an inference.

Checked by hand on the awkward ones: Christiansfeld resolves to Kolding, Ribe to
Esbjerg, Rømø to Tønder, Skagen to Frederikshavn, Anholt to Norddjurs.

### A wider scope still contains a narrower one

`placeMatches("Jutland", …)` now also passes when the draft's *region* is in
Jutland. Without that half, adding regions would have **quietly turned off every
part-scoped source** the moment a draft learned its region. Nothing would error.
The drafts would just start finding less.

### And the domain you named would have been refused

`normaliseDomain` allows `[a-z0-9-]`. **ø is not in it**, so the panel would have
answered *"visitsønderjylland.dk is not a domain I can use"* about a site that
exists. The real address is `visitsonderjylland.dk` in plain letters, because ø
reaches DNS only through punycode and the tourist boards did not bother.

Danish letters are folded now, the way this app folds them everywhere else. That
also settles Århus against Aarhus in a hostname. The fold runs **before** the
shape test, so nothing previously refused is accepted — there is a test for
exactly that, and it caught my first version turning `hello world.dk` into a
domain.

---

## 2. Maps first

### It was an ordering bug, and the dead line proves it

    App.jsx : 2095   the founder sources were chosen
    App.jsx : 2363   the geocode ran
    App.jsx : 2712   the Google address recovery ran

So every draft picked which tourist board to pay for **before anything in the
run knew where the place was**. For a town that mostly worked, because a town's
name is its location. For an event it never worked at all.

The proof is a line that could only ever return null:

    part: known ? partOfCountry(known)
                : (draftTown ? partOfCountry({ town: draftTown }) : "")

`partOfCountry` reads `__lat`/`__lon`. `{ town: draftTown }` carries neither. So
**a part-scoped source has never once matched a first-time draft**, silently,
since the day the field was added.

### What runs now, before anything is searched

    1. the coordinate on the published row, if there is one
    2. Nominatim on the name
    3. Nominatim on "name, town"
    4. Google Places text search          <- the one that finds events
    5. the town centre, marked imprecise

Then `regionAt(lat, lon)`.

**It costs nothing extra.** Steps 2, 3 and 5 are the same calls that used to run
250 lines later; the frozen-facts block now reads the answer instead of starting
over. Step 4 is the only genuinely new call, and it only fires when Nominatim
missed, which is the case it exists for: Nominatim indexes *addresses*, and a
festival is a business listing.

`/api/places-locate` is a **separate route** from `places-hours` on purpose.
That file's own comment says its opening-hours fields put it on Google's Place
Details **Enterprise SKU**. Running the expensive call at the start of every
draft to find a latitude would be paying enterprise rates for a coordinate.

### And the models are told, not just the source list

`researchRules` is called four times per draft and **three of them were handed
the bare name**, which `placeMatches` reads as `{ name }` with every other field
undefined. So three of four could not scope anything at all. All four now carry
the measured region, and the prompt says:

> WHERE THIS IS, ALREADY MEASURED: Sønderjylland, Tønder Kommune, in Denmark.
> That came from a map lookup on this place's own coordinate before this search
> was written, so treat it as settled and use it to NARROW what you look at.

---

## 3. The 2017 Esbjerg source

You were right, and the hole was bigger than the example.

`PERISHABLE` was `price, date, opening hours, phone number, booking, transport,
timetable`, and the line under it said everything else *"is history and has no
shelf life"*. **A restaurant existing is not on that list.** So a 2017 page
saying the harbour has three fish restaurants was a permanent fact, reached the
draft unchallenged, and the reader walks to a closed door.

The distinction the rule was missing is not old against new. It is **a fact
about the past** against **a fact about the present written in the past**.
"Founded in 1868" was true in 2017 and is true now. "The harbour has three fish
restaurants" was a claim about 2017 the whole time, and only reads as timeless
because of the shape of the sentence. That second kind is the dangerous one
precisely because none of it looks like a number.

### And the list had four copies, already drifting

`PERISHABLE` was **exported and read by nothing** — a written-and-never-wired
list, the same shape as `geocodeOne` and `unplaced` and `tripCharacter`. The
rule was restated in prose three other times, and they already disagreed: the
list carries booking, transport and timetable, and `sourceOrderBlock` named none
of the three.

Now: one list, `perishableSentence()` builds the sentence from it, and all three
prompts say it by calling that. `EXISTENCE_RULE` is its own paragraph because a
venue name reads as scenery where a price reads as a number:

> Naming a restaurant, café, shop, bar, hotel or venue as somewhere the reader
> can GO is a claim about today. What the place IS stays fine: its history, its
> landscape, what happened there. Who is trading there now does not. If an old
> page is the only thing naming a business, either leave the name out or say
> plainly that it was open as of that page's date.

You said no to the hard age cap, to showing readers the year, and to sweeping
the 92 published rows. All three are still open and none is started.

---

## 4. Two bugs the region test found, both already live

I added an assertion that the region and the landmass could not disagree. They
did, twice.

### Samsø answered differently depending on where on it you stood

Measured against your own `DK_SHAPES`:

    Samsø north tip   ->  Jutland   (Jutland 23.0km | Zealand 39.6km | Funen 46.2km)
    Samsø centre      ->  Funen     (Funen  26.2km | Jutland 33.0km | Zealand 33.9km)
    Samsø south tip   ->  Funen     (Funen  23.7km | Zealand 32.0km | Jutland 35.1km)

One island, three points twenty-six kilometres apart, two answers. **The towns
page has been filing Samsø under the Funen pill.** Samsø Kommune is in Region
Midtjylland and its ferry leaves from Hou in Jutland.

### Anholt had no landmass at all

`geography.js` says in its own comment that Anholt *"sits around 40 km from the
Jutland coast"*, and `MAX_OFFSHORE_KM` was sized at 45 on the strength of it. It
measures **49.7**. So Anholt fell past a cap set from an estimate ten kilometres
short, and was invisible in every geography filter and counted among the
unplaced.

Neither is a bug in the outlines. It is a bug in **asking them**: five coarse
shapes cannot say which landmass an island twenty-five kilometres offshore
belongs to, and no redrawing fixes it, because the answer is not about distance.
Samsø is Jutland's because of its ferry and its kommune.

`partOfCountry` asks the kommune table first now and keeps the outlines as the
fallback, so a point in coastal water outside every kommune box is placed
exactly as before. Endelave moved to Jutland the same way (Horsens Kommune).

---

## Files written to your disk

    src/data/kommuner.js           NEW   99 kommuner from dataforsyningen.dk
    src/utils/regions.js           NEW   the twelve regions, and the resolver
    api/places-locate.js           NEW   basic-tier Places, for events
    src/App.jsx                          maps first, region into every prompt,
                                         the panel, the dead partOfCountry line
    src/utils/sourcePolicy.js            the region tier, Danish letters
    src/utils/pageScan.js                existence expires, one perishable list
    src/utils/geography.js               the kommune answers the landmass first
    src/data/mapShapes.js                KM_LAT/KM_LON moved here, no import cycle
    tests/run.mjs                        3501 assertions

## First thing tomorrow

    cd C:\Users\olive\OneDrive\Dokumenter\GitHub\OnlyHere\onlyhere-project
    node tests/run.mjs          # expect 3501 passed, 0 failed
    npx vite build              # expect a clean build
    cd ..
    git add -A && git commit -m "Regions, maps before research, existence expires" && git push

Then in Studio, add `visitsønderjylland.dk` with **only for: Sønderjylland**.
The row should come back as `🗺 Sønderjylland · region`, hovering should name
Haderslev, Sønderborg, Tønder and Aabenraa, and the domain should have been
stored as `visitsonderjylland.dk`.

Draft any Sønderjylland event. The run log's first line is now **"Where this
place is"**, and it should name the region before a single search has run.

## Still open, and not touched

- The three you turned down: a hard age cap past N years, printing the source
  year in *How we know*, and sweeping the 92 published rows for old sources.
- Everything still open from handoff 10: the apex domain not resolving,
  nonexistent paths returning 200, seven festivals with empty dates, the
  glance-leak gate not knowing the shape "check copenhell.dk", food row 36
  Hyttefadet with no `desc`, TinderBox row 62's backwards date range, and the
  five towns with duplicate published rows.
