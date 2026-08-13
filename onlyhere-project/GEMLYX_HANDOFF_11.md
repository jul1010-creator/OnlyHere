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

---

# Part two — reaching every source you added

> *"When it searches on the web for events, towns, attractions, etc. include the
> research sources I have implemented. Perhaps they'll help."*
>
> *"I mean the 'discover new events' tab."*
>
> *"billetexpressen.dk needs to be on both attractions and events.. but I can
> only put it on one."*

    Suite      3567 passing, 0 failing   (was 3501)
    Mutations  16 more run, every one red before its commit
    Build      vite build clean

## 5. Your own run log measured the problem

From the Græskarfestival draft you sent:

    2. Founder sources chosen  [tavily · ok]
       got: 4 of 18: billet.unitedtickets.dk, billetlugen.dk, billetto.dk,
            kultunaut.dk

**Four of eighteen.** All four are ticketing, because the specificity sort puts
festival-scoped sources first and you have four of those. So
`billetexpressen.dk` never ran a search — and Billetexpressen is where that
festival's tickets are sold. Its URL is sitting in the finished draft's own
`__sources` because the **general** web pass tripped over it, and Gemini named
it too. The one source that had the answer was the one the cap cut.

`include_domains` takes a list of up to 300, so everything past the cap now fits
in **one** call. Cost per draft goes from four searches to five.

The top four keep their own dedicated searches rather than being folded in, and
that split is the point: results from a combined query are ranked across the
whole set, so a site with thousands of pages crowds out the parish council's one
relevant PDF. A source with its own call is guaranteed its own results. The
overflow call cannot promise that and does not need to — its job is that nothing
on your list is unreachable.

## 6. The discover tab

It plans five queries and runs five plain web searches. **Not one of your
eighteen domains has ever been searched by it**, and one of the five slots is
briefed as *"one at local/regional tourism sources"* — so the planner has been
asked to guess at the list you already wrote down.

That is the wrong way round here more than anywhere else. A Danish festival's
first appearance anywhere is a line on a tourist board's what's-on page or a
kultunaut listing. Discovery is the one step where those sites are not a
cross-check, they are the primary index, and it was the one step that never
opened them.

One combined call across every in-scope source, and the planner is now told
which sites are already covered so it spends its five on forums, blogs, local
news and roundups instead. A discovery query is shaped like a listing page
(`kalender hvad sker der arrangementer`), not like the draft-side queries which
assume you already know the name.

## 7. billetexpressen.dk on both

`applies_to` held one type. It holds a comma list now, stored in the same column,
so every row already in your database keeps working with no migration and blank
still means every type. The picker is chips rather than a dropdown, because a
`<select multiple>` needs ctrl-click and nobody ever discovers it.

One thing the change had to be careful about: you *could* have added the domain
twice, once per type, and the duplicate check would have allowed it. But
`sourcesFor` dedupes **by domain**, so those two rows only stayed separate
because the type filter happens to run first. Anyone reordering those two lines
would have silently dropped one of them.

Sort order changed with it: "has a type" stopped being specific enough once a
source can carry several. A domain scoped to Events alone was chosen *for*
events; one scoped to Events + Attractions + Workshops is a general ticketing
site. Fewer types now sorts first.

## 8. The issue in your file: the draft ran blind

    1. Where this place is  [fetch · empty]
       got: nothing placed "Græskarfestival", so no region is known
    8. Location lookup      [fetch · empty]
    9. Opening hours and address  [google · FAILED]
       why: Places answered but refused: No matching place found

No region, no coordinate, no nearest stop. And then the absence gate did its job
and made it **worse for the reader**: the writer had put *"There's no train
station in Skælskør itself; the nearest are Slagelse or Korsør"* into the prose,
nothing had measured that absence, so it was correctly cut. The reader ends up
told nothing at all about getting there — when Gemini found the real answer
(train to Slagelse, then the 470R bus to Havnepladsen, 1h55 from København H).

**The town was never actually unknown.** That same draft's own `mapHint` reads
`"Havnepladsen, 4230 Skælskør, Denmark"`. The writer worked it out from the
research, which means it was sitting in text the pipeline had already paid for,
several steps before anything needed it.

A Danish postal address is four digits and a town — a shape code can read
exactly. `danishAddressIn` now reads it out of the research and retries the
location lookup. **Most repeated wins, not first**: a research blob also
contains the ticket vendor's registered office and the tourist board's own
address, and each of those appears once while the venue's is on the listing, the
official site and the roundup. In your Græskarfestival text, `4230 Skælskør`
appears three times and `8000 Aarhus C` once.

It runs **after** the research (that is where the address is) and **before** the
sources are chosen (otherwise the region it finds scopes nothing). Putting it
after the draft would have been easier and would have fixed nothing that matters.

What that would have changed on your run: a coordinate in Skælskør, region
Midt- og Vestsjælland, a real nearest-stop lookup, and the region in every
research prompt.

## 9. What the suite caught me doing

Worth recording, because it is the same class of bug this project keeps finding:

- I wrote `.map(r => r.snippet).join(" ")` in the overflow search. That exact
  anonymous join is **banned by name** in the suite, because it is what stripped
  the host off every snippet and left the source hierarchy ranking a blob it
  could not see inside. Caught immediately.
- My first fold in `normaliseDomain` stripped spaces, which put it in front of
  the `includes(" ")` guard and would have accepted `hello world.dk` as a
  domain. Caught by the assertion that nothing previously refused is accepted.
- Two of my own new assertions passed for the wrong reason: fixtures where
  alphabetical order and specificity order happened to agree, and where the
  venue's address was also the first one in the text. Both rewritten so the two
  rules disagree.
- A pre-existing assertion indexed `[0]` on a possibly-empty array, so one of my
  mutations **crashed** the suite instead of failing it and sixty later
  assertions went silent. Guarded, along with five of my own.

## Files, part two

    src/utils/sourcePolicy.js      multi-type sources, overflow search, discover search
    src/utils/regions.js           danishAddressIn
    src/App.jsx                    second location attempt, overflow wiring,
                                   discover wiring, the multi-type picker
    tests/run.mjs                  3567 assertions

## Try it

Add `billetexpressen.dk` and tick **Events** and **Attractions**. The row should
read `Events + Attractions`.

Redraft Græskarfestival. The log should now show **"Where this place is, second
attempt"** naming `4230 Skælskør`, and **"Founder sources past the cap"** naming
the fourteen it used to cut — billetexpressen among them.

---

# Part three — tickets, starting with the price

> *"We just need to focus on getting tickets right until then."*

    Suite      3623 passing, 0 failing   (was 3567)
    Mutations  12 more run, every one red before its commit
    Build      vite build clean

## 10. Rejseplanen, since you asked first

Short version, and you corrected me on the important word: **the static GTFS is
free but you still have to apply** — a contact form, not a download link. It is
CC BY 4.0 and *"du må gerne bruge vores statiske data i kommerciel sammenhæng"*,
so a commercial product may use it. Updated roughly every 14 days, minimum two
months forward.

The **live API is different**: the 50K calls/month free tier is
non-commercial only, and *"Rejseplanens API må kun bruges i kommerciel
sammenhæng, når der er indgået en aftale"* — Gemlyx would need an agreement.

Worth knowing for later: most of what has bitten us does not need journey
planning. "Does Skælskør have a station", "what serves this stop", "is there a
470R" are stop and route lookups. Only a full Copenhagen-to-Møgeltønder
itinerary needs the API.

## 11. Four findings on tickets, and the last one is the sharpest

- **`"billetto"` is in `MEASURED_SOURCES` and there is no Billetto integration
  anywhere in the codebase.** A status value nothing can ever produce — the same
  dead-enum shape `tickets.js` already documents about two of its four badges.
- **`"official-site"` is NOT in `MEASURED_SOURCES`.** So the festival's own
  ticket page can never produce a measured status while Ticketmaster can, which
  directly contradicts your own rule: *"the tickets on the official website HAS
  TO BE PRIORITISED."*
- **Ticketmaster can almost never fire.** `tickets.js` says so itself: Danish
  festivals "sell through Billetto, Ticketbutler, or a form on their own site".
- **Your Græskarfestival run had the answer in hand.**
  `billetexpressen.dk/venue/graeskarfestival` — a venue page for that exact
  festival — was sitting in `__sources`. The ticket step never looked at it and
  reported `verdict: "no-match"`, `source: "writer"`.

## 12. Nothing ever went looking for a price

`tracePrices` is a good gate and it can only answer one question: **is the price
the writer stated supported.** When the writer states nothing it returns an
empty list and reports nothing, which reads as a pass. Both of your runs ended
exactly there:

    Ribelund, 12 Aug      "Pris: Entré: 400 kr." sat in a kultunaut snippet the
                          pipeline had already fetched, and the entry shipped
                          with no price
    Græskarfestival,      16. Prices against the official site [google · ok]
    13 Aug                    got: the draft states no price

A clean verdict on a missing answer. This is your own universal diagnosis in its
worst form: not *"the pipeline measures and lets prose describe the
measurement"*, but **the pipeline never measured and let silence stand.**

`ticketPriceOn` reads what a page says a ticket costs. **Finding is stricter
than checking**, which is the opposite asymmetry to the one `tracePrices`
documents, for the same underlying reason: a figure invented here goes into a
field a reader plans around, a figure missed here leaves things as they already
are. Three conditions, all required — a currency token, a ticket word within 80
characters before it, and that word not being one of the things sold *beside*
the ticket (camping, parking, booking fee).

**Free is an answer**, not an absence. Most of the small Danish events this app
writes about are free, and a finder that only reports numbers reports nothing
for them — which reads identically to having failed. A price on the same page
wins over the word free, because "gratis for børn, voksne 200 kr" is a paid
event with a concession.

**Your order, enforced**: the operator's own page first, a ticket shop or
calendar second, and the tier travels with the answer. A price from the operator
can be stated flatly; one from a reseller has to say where it came from.

The finding goes to `__notes`, not `uncertainties` — `shapeForLive` is an
allow-list so a `__` field cannot leak to a reader, and this is a message to you
about a gap in the draft, not a caveat for a traveller. That leak has happened
once already. And the number is never written straight into a published field:
it goes back through the writer and every gate a written price already passes.

It lives inside `gateDraft`, so it **runs again after the auto-correction**.
Fifth standing rule.

## 13. What the suite caught, again

**The Danish letters bit for the fourth time this week.** The first
`TICKET_WORD` pattern ended in `\b` after "entré". JavaScript defines a word
boundary on `[A-Za-z0-9_]`, so **é is a non-word character**: non-word beside
non-word is no boundary, and the pattern could never match.
`ticketPriceOn("Entré 400 kr")` returned null — the finder was dead on exactly
the Danish pages it was written for. Same family as the NFD-before-å bug in
`fold()` and the missing boundary in `containsName`. The fix is the one this
codebase already settled on: fold the text, keep the pattern ASCII.

Three of my own assertions passed for the wrong reason and were rewritten:

- `ticketPriceOn("Camping 200 kr")` never reached the ancillary check at all,
  because no ticket word preceded the figure either. It passed whether or not
  the rule existed. Now `"Billetter til camping koster 200 kr"`.
- The no-price finding and the wrong-price finding produced indistinguishable
  assertions — same count, same severity, both quoting the page's figure — so
  deleting the no-price branch left everything green.
- The window test built its filler as `TICKET_WINDOW + 40` characters, so
  widening the window widened the test with it. This file's own notes name that
  trap: *a test written relative to a constant cannot catch that constant being
  wrong.*

And two more `[0]`-on-empty-array crashes, mine this time.

## Files, part three

    src/utils/entryAudit.js    ticketPriceOn, findTicketPrice, priceMisses
    src/App.jsx                wired into gateDraft, so it runs twice
    tests/run.mjs              3623 assertions

## Try it

Redraft Græskarfestival. The log gains **"What the pages say a ticket costs"**,
and if any page you fetched states one, a draft without it now carries a note
saying so instead of passing clean.

## Still open on tickets

- **Billetto is declared measured and connected to nothing.** Either build it or
  take it off the list — a source that can never speak makes the enum look
  covered.
- **The status half.** You chose price first; on sale / sold out / free is still
  almost always the writer's guess, and two of the four badges remain values
  nothing can produce.
- **`official-site` still is not in `MEASURED_SOURCES`.** The price now respects
  your hierarchy. The status does not yet.
