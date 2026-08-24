# Handoff, 24 August 2026

Written while Oliver slept, after he brought back three things at once: the
`HANDOFF_NEXT.md` orientation, the fifty point ChatGPT review as a document, and
the first feedback his boss has ever given on Gemlyx.

**One code change, five files, and it is at the bottom of this file.** Everything
above it is recorded feedback or an investigation result. Two of the
investigation results are corrections to things we thought were broken and are
not, and both of them say *do not change this*. A third found a feature we were
about to build for the second time.

Changed on disk, uncommitted:

    src/App.jsx
    src/pages/GuidePage.jsx
    src/components/ReviewsSection.jsx
    src/components/LiveEventsHeaderStrip.jsx
    tests/run.mjs
    tools/englishStrings.mjs     (new, a report, not part of the suite)

`node tests/run.mjs` gives 9,905 passed, 0 failed. `npx vite build` is clean.

---

## Kristian's feedback, which is the new thing

Kristian Dandanell is Oliver's boss. He wrote in Danish over Slack on 24 August,
his first look at the site:

> Den ser godt ud. Lige til at starte med, så tænker jeg flere sprog. Både dansk
> og tysk ud over engelsk. Fotos på alle stederne. Få lavet en tip knap, så man
> kan skrive tips. Hvis der f.eks. er en mindre by som har en koncert dag du ved
> ligesom Løkken koncert. Kan godt uddybe i morgen, hvis det er. Skal nok se om
> der er mere jeg kan komme på

Four asks:

1. **More languages.** Danish and German on top of English.
2. **Photos on all the places.**
3. **A tip button**, so a reader can submit a tip.
4. **Small town events**, his example being Løkken Koncert.

He offered to elaborate the next day, so this list will grow.

**Two of these are already the top of our own list**, arrived at independently,
which is the most useful thing about them. Three sources with no contact with
each other (Kristian, the ChatGPT review, Oliver's own notes from reading his
live guide) all point at languages and at date-aware event coverage. That is a
stronger prioritisation signal than any one of the three on its own.

---

## Løkken Koncert, and two rules that are already right

This is the part worth reading carefully, because the obvious fix would have
been wrong in two places.

**What Løkken Koncert is:** 11 July 2026, Løkken Stadion, an annual one day
concert in a North Jutland beach town of roughly 1,500 people. It sells its own
tickets at `billet.loekkenkoncert.dk` and it sells out. Sources:
`loekkenkoncert.dk` and `billet.loekkenkoncert.dk`.

It is the sharpest possible example of Kristian's point, and three things in
this repo looked like they would keep it out. Two of them do not.

### Not the two month horizon

`EVENT_HORIZON_MONTHS = 2` in `tripEvents.js:436` reads like a hard ceiling on
how far ahead an event may be. It is not. Look at the branch order in
`tripEvents`:

```js
const overlaps = overlapsTrip(e, win);
if (overlaps === true) tickable = true;
else if (overlaps === false) { ... }
else if (ended) { ... }
else if (!eventWindow(e)) { ... }
else if (!wasNamed && beyondHorizon(e, today)) continue;
```

`overlapsTrip` returns `null` only when `!win || !win.dated || !win.start`. So on
a trip whose dates we know, `overlaps` is `true` or `false` and **`beyondHorizon`
is never reached.** The comment at line 426 says this outright: the horizon is
the undated case only, and a dated trip has a better bound already. A traveller
who says "we are in Jutland in July" is inside the trip window, not the horizon.

Raising the constant would change nothing for a dated trip and would weaken the
undated case, which is the only case it governs.

### Not the major-only rule

`thinCrowdedTowns` at `tripEvents.js:539` looks like it would drop a small town
event for not being Major. It cannot:

```js
if ((per.get(t) || 0) <= MANY_EVENTS_IN_A_TOWN) return true;   // MANY = 4
if (!(majors.get(t) || 0)) return true;
return isMajorEvent(r.event);
```

A town needs **more than four surviving events** *and* **at least one Major among
them** before anything is thinned. Løkken with one event keeps it. The rule was
written for Copenhagen and it only ever bites in Copenhagen. The comment above it
says so, and the adversarial pass that produced the current version is recorded
in the 23 August handoff.

### The ticket gate is real, and it is already handled

`isBookableTicketUrl` in `ticketLink.js:115` takes a Tiqets product page or a
Ticketmaster or Live Nation event page and nothing else, so
`billet.loekkenkoncert.dk` gets no **🎫 Book tickets** button. That refusal is
deliberate, and `describeTicketSearch` already states the reasoning in words:

> Plenty of Danish events sell through their own site or a local agent, and no
> ticket link is the right answer for those.

And the reader is not left with nothing. `DetailPage.jsx:779` renders a
**🌐 Visit website** button for any event carrying a `website`, through
`externalHref` and then `affiliateHref`, which passes a non-partner host through
untouched and prints no commission sentence. So a drafted Løkken Koncert entry
already points a reader at the official site, earns nothing, and says nothing
false about money. **That is the correct behaviour and it needs no change.**

There is a real point buried in it worth stating on its own: Gemlyx earns
nothing on Løkken Koncert and should tell people about it anyway. A product that
only surfaces the events it can monetise is a product whose recommendations
cannot be trusted, and terms clause 14 and privacy section 13 both already
promise otherwise. Løkken is the cheapest possible proof that the promise is
real.

---

## So what keeps Løkken out: nothing has drafted it

`src/data/events.js` is three empty arrays and a comment. Every festival Gemlyx
knows about arrives at runtime from the `gemlyx_content` table via
`ensureLiveContentLoaded` in `liveContent.js:155`, and every row in that table
was published by one person through the Content Studio.

There is no calendar ingest, no feed, no scrape, no queue of candidate events.
**Løkken Koncert is in Gemlyx if and only if Oliver drafted it.**

That reframes Kristian's fourth point completely. It is not a filtering bug and
there is no rule to loosen. It is a coverage problem, and the bottleneck is one
person's attention. Which means:

**Kristian's third ask and his fourth ask are the same ask**, and the answer to
both is already built.

### The tip button exists. He did not find it.

`App.jsx:19533` is a **💡 Suggest a Place** modal: a name field, six type pills
(Event, Town, Attractions, Food, Nightlife, Shopping), a town, a note and an
email. Its placeholder is `e.g. Ringkøbing Harbour Festival`, which is a small
town event, so whoever wrote it was answering Kristian's question before he
asked it.

And it already carries the policy that the promise requires, in its own words:

> We read every suggestion, and nothing goes live automatically. If it's a real,
> worthwhile find, it'll show up in Gemlyx, hand-researched and checked against
> multiple sources, same as everything else.

The privacy policy covers it too, in the modal's own summary and in
`public/privacy.html`: "If you send a suggestion or a booking request, what you
type is stored so it can be read and acted on."

**So the feature is not the work. The discoverability is.** There is exactly one
way in, `setSuggestOpen(true)` at `App.jsx:17786`, a dashed card headed "Know a
place we're missing?" sitting below the fold on one screen, underneath the Build
my trip button. Kristian used the site, wanted this exact thing, and asked for it
to be built.

That is a better finding than a feature request, because it is cheaper and
because it generalises: **the eleventh instance of this project's signature
failure is not an unwired function this time, it is a wired one nobody can
reach.** A button with one entry point below the fold is, from the reader's side,
indistinguishable from a button that does not exist.

What to do, in order:

1. **Put it where a suggestion occurs to somebody.** The moment a reader thinks
   "you are missing Løkken Koncert" is while they are looking at the Events list
   for their own region and not finding it, not at the bottom of the planner
   screen. An entry point on each empty or thin list, plus one in the footer,
   costs an afternoon.
2. **Say what happens next.** The modal's sentence is good and nobody reads it
   until after they have clicked. Some of it belongs on the entry point.
3. **Then look at whether tips have anywhere to land.** A suggestion that
   arrives by email and is read once is not a queue. `studioDraftStore.js`
   already exists.

Only after all that, if it is still needed, an ingest of Danish event calendars.
It is the expensive option and the one most likely to produce the "AI slop at
scale" the fifty point review warns about at item 37. Two local tips beat two
hundred scraped rows nobody checked.

### One precedent worth knowing about

`ReviewsSection.jsx` already publishes unverified stranger text on entry pages,
under the label "Real visitor comments, not edited or verified by Gemlyx, shown
as written." So the promise is not "nothing unverified is ever displayed", it is
"nothing unverified is displayed as Gemlyx's own claim." That distinction is
already made and already labelled, and a tip feature should inherit it rather
than reopen the argument.

---

## The homepage question

Oliver asked whether the front page should say "plan your trip with AI", his
reasoning being that "plan my trip" is how people now expect to plan a trip.

**The verb is right and the qualifier is wrong.**

Right: nothing above the fold currently says a planner exists. The hero says
"Beyond the guidebooks" and "Hidden gems", both of which every competitor also
says, and a visitor can read the whole first screen without learning they can
have a week built around their dates. This is already point 3 in
`HANDOFF_NEXT.md`.

Wrong: "with AI" is the one claim every competitor already owns, and the 2026
survey evidence runs against it. Booking.com's 37,000 respondent study found 6%
fully trust AI outputs. Wunderkind, July 2026, found 24% trust AI travel
recommendations and 43% feel overwhelmed by AI's presence. Expedia's YouGov work
put 67% at "would not trust AI to book".

The specific problem for this product: what AI planners are distrusted *for* is
inventing places and opening hours, and the entire architecture of this repo is
the answer to that. Leading with "AI" volunteers the accusation and buries the
defence. The independent reviews of Layla, the funded competitor, land on no cost
breakdown, no verification and no auditable reasoning, which are three things
Gemlyx built and does not say on its homepage.

Where "AI" belongs is the title tag, the meta description and the second screen
explaining how the planner works, because people do search for "AI trip planner
Denmark" and that traffic is free. Not the hero claim.

**Not written into `App.jsx` and deliberately so.** Copy is his call, and this
repo pins copy in assertions, so a hero rewrite is a suite change as well as a
render change. Draft for him to approve:

> **Denmark, planned around your dates.**
> Towns, events and nights out, each one checked against the place's own sources
> before it is printed.
> `[ Plan my trip ]` `[ Explore Denmark ]`

The subtitle is his own meta description, which has staked the right claim for
weeks and has never appeared on the page.

---

## The other two of Kristian's asks

**Photos on all the places** is part built and unmeasured. The licence clearing
runs through `api/commons-photo.js`, `imageCredits.js` holds the attribution
rules, `guideHero.js` reads `photo` and `__photoCredit` off a published row, and
`chatPlaces.js` shows one when a place is named in conversation. What nobody has
is a number: how many published rows carry a photo. That count needs the live
table and therefore needs Oliver. It is the first thing to get before deciding
whether this is an afternoon or a fortnight.

**More languages** is `HANDOFF_NEXT.md` point 2 and it is the thing his father
hit. Worth restating why German is the right second language and not a guess:
Denmark's 2024 inbound market was Germany 6.0m, Netherlands 2.0m, United States
1.1m, United Kingdom 0.9m, Sweden 0.8m. `travellerWords.js` already reads six
languages on the way in, German included. It is the frame that is English only.
A catalogue of those strings is the companion file to this one.

---

## The one code change in this pass: eleven dashes were on screen

Found while cataloguing the English strings, which is the only reason it was
found at all.

Rule 1 is absolute and it is quoted at the top of `HANDOFF_NEXT.md`: no em
dashes and no en dashes anywhere, in replies, in code comments, and in any copy
the product generates. **Eleven were rendering to travellers**, in copy typed by
hand:

* four save and load failures on the guide page,
* the unsaved-guide explainer and the save button itself,
* three lines in the reviews section,
* four in the craft booking sheet and the section intros for Attractions, Events,
  Food and camping,
* and the events-near-you counter in the header strip.

**`stripDashes` and `stripDashesDeep` are correct and could never have caught
any of them.** One runs on MODEL output, the other on PUBLISHED ROWS as they
load. A string typed into a component goes through neither.
`GuidePreviewScreen.jsx:912` says so in a comment somebody wrote and nobody
acted on: *"in this codebase runs stripDashes; this string was typed by hand"*.

This is the same shape as the 13 August index.html find, one layer in. That
comment says the rule is "enforced in thirty-two places and not one of them
looked at index.html". None of them looked at the rendered text either.

### The assertion, and the one it replaced

Appended to `tests/run.mjs`. It asks about **JSX text nodes**, not about every
string in the file, and that distinction is what makes it survivable: a text
node is on a screen by definition, while a string literal in these files may be
a model prompt, and a prompt legitimately uses a dash to separate a day from its
stops before a model reads it. Asserting over every literal would go red on
GuidePage's own stop list and the next person would loosen the assertion rather
than fix the copy.

The Studio is excluded, by balancing braces out from each `isStudio &&` rather
than by a line number, and a separate assertion fails if that span finder ever
finds zero, so the exclusion cannot silently become "skip everything".

**And the first version of the companion assertion had this repo's signature bug
in it.** Three `ok(/Couldn't save this guide\. /)` presence checks stayed GREEN
when one of the two sentences beginning that way lost its full stop, because the
other one still matched. It is now a rule over the whole set: collect every
failure sentence, and assert none of them carries a dash. A comma or a colon
passes, which is right, because his rule names all three as the replacement.

Mutation tested four ways, each red or green by name:

| Mutation | Result |
| --- | --- |
| a dash back into a traveller-facing text node | red, names the file and the sentence |
| a dash inside the Studio block | green, so the exclusion is real |
| the `isStudio` span finder made to match nothing | red, so it cannot pass by finding zero |
| a dash back into ONE of two sentences sharing a prefix | red, which the first version missed |
| a comma in place of a full stop | green, which his rule allows |

**9,905 passed, 0 failed. Build clean at 1,617.00 kB.**

Two things left for him, both voice rather than rules:

* Two JSX text nodes outside the Studio still contain "actually": the Attractions
  intro and the Food intro. Deleting the word changes nothing in either, but it
  is his copy.
* Around thirty more dashes sit in code COMMENTS across the surface files. Rule 1
  covers those too. Left alone deliberately: they are explanatory prose, several
  of them quote the exact string a fix removed, and rewriting them is the fastest
  way to lose the reasoning this repo runs on.

---

## Why the pictures are not showing

He asked, having put images in `public/`: "why is some pictures being blocked? I
have pictures on some towns and places, but they're not shown."

Nothing is blocking them. **Almost none of them are reachable**, for two reasons
that have nothing to do with licences, and one that makes both permanent.

### 1. The folder

`shapeForLive` writes a template path per type, and there are exactly six
folders it can name:

    /towns/  /events/  /food/  /nightlife-streets/  /nightlife-towns/  /craft/

`public/` holds `towns/`, `attractions/`, `brand/` and about thirty-seven loose
images in the root. So **every festival photo he has is in `public/` root while
the code looks in `/events/`**, and `public/events/` has never existed. Same for
food, nightlife and craft.

`public/attractions/` is reachable only through the Studio filename field, which
runs on a fresh draft and never on an edit of a published row. The comment at
`App.jsx:8246` already recorded this once: "public/free/ has never existed, so
every path this map has ever written for an attraction pointed at a folder that
is not there, and six perfectly good images sat orphaned beside it."

### 2. The filename

`slugify` is `s.toLowerCase().replace(...).replace(/[^a-z0-9]/g, "")`. It deletes
hyphens, spaces and capitals. So in `public/towns/`, which IS the right folder:

| File | Path the code builds | Reachable |
| --- | --- | --- |
| `aeroskobing.jpg` | `/towns/aeroskobing.jpg` | yes |
| `ebeltoft.jpg` | `/towns/ebeltoft.jpg` | yes |
| `skagen.jpg` | `/towns/skagen.jpg` | yes |
| `Nysted.jpg` | `/towns/nysted.jpg` | **no**, capital N |
| `thorup-strand.jpg` | `/towns/thorupstrand.jpg` | **no**, the hyphen |

**Three of forty-eight content images can be reached.** The other forty-five are
sitting on disk, deployed, costing bandwidth in the repo, and unreferenced.

### 3. And the probe runs once, at publish

`App.jsx:8623` loads the path with an `Image()` before saving and **deletes the
`photo` key** when it 404s. That is correct behaviour and the comment above it
argues for it well. The consequence nobody has written down: a file added to
`public/` AFTER a row was published changes nothing, because that row no longer
has a photo field to fix. **Correcting the file is step one. Republishing the row
is step two, and without step two nothing happens.**

### The tool, and the trap in the obvious fix

`tools/contentReport.mjs` prints the verdict per file, and with network access
also prints every published row's photo state. Run it before touching anything.

**Do not reach for Studio's Backfill photos button first.** It selects rows whose
photo does not load, which is exactly the set above, and fills them from
Wikimedia Commons. Run today it would replace his own photographs with
strangers' and there would be no way afterwards to tell which rows had one of
his. Fix the paths of the ones he cares about, republish those, and only then
backfill the remainder.

Worth deciding separately, and it is his call: the template path has now been
wrong more often than right for three weeks running (the file's own comment says
52 of 53 on 7 August, this says 45 of 48 today). Building a path from a slug and
hoping a file is there is the guess; the Media panel and the Wikimedia finder
both write an absolute URL, which is the value that survives. Removing the
template path entirely would make "no photo" honest instead of accidental.

---

## Where Gemlyx is thin, and whether it can say so out loud

He asked whether the pipeline's own "this area lacks content" finding can be
said outside the Studio, and which gaps are critical.

**The count itself must not go outside.** "Sønderjylland has two entries" is an
instruction to a founder and an obituary to a traveller. What CAN go outside is
the same thing said as scope rather than as shortage:

> Four places near Tønder, all checked against their own sources. That is what
> this guide is built from.

That is not an apology, it is the promise being kept where it costs something.
Every competitor's Sønderjylland itinerary is padded to look full. This one says
how many, and the number is the proof.

Three rules if it is built:

1. **Never a bare shortage.** State the count only where the alternative would be
   padding, and always beside what Gemlyx did instead: widened the radius, used
   the region, offered the nearby ones. The vocabulary already exists on the
   preview screen, in `GuidePreviewScreen.jsx`: "Worth considering, but a long
   way", "You did not ask for these, so Gemlyx left them out."
2. **Pair it with the suggest button**, which is the entry point that has no
   entry point. A thin list is the exact moment somebody thinks "you are missing
   Løkken Koncert", and it is the moment the button should be under their thumb.
   This is the same fix as the discoverability finding above, arriving from the
   other direction.
3. **Never on a region where the count is fine.** A product that keeps mentioning
   how much it has reads as anxious.

### Which gap is critical is not which gap is biggest

`tools/contentReport.mjs` prints the grid from the live table, and it ranks by
what a gap BREAKS rather than by size, because those are different orders:

* **no town in a region** means no day can be built there at all;
* **towns but no attractions** means days with nothing in them;
* **fewer than three towns** means every trip to that region is the same trip;
* **no events** means nothing there is date-aware, which is the differentiator.

Food and nightlife come last on purpose. His own note already says there are too
many restaurants, and nightlife's problem is that it has no filter system at
all rather than too few rows.

One strategic point the grid will not print. The meta description stakes the
claim on "Denmark past the three days everybody spends in Copenhagen". So a thin
region in Jutland is not a gap in coverage, it is the product failing at the one
thing it says it is for. Copenhagen coverage is table stakes; Jutland coverage
is the proposition. Rank the regions accordingly.

---

## Every Danish island was being called mainland

Gemini fact-checked a Bybjerg draft and said the routing was physically
impossible. It was right, and the cause is worse than one entry.

`classifyFerry` decides whether a ferry on a driving route is required or a
shortcut, by re-querying with `avoid=ferries`. **Google's `avoid` is a
preference, not a constraint.** When it cannot honour the restriction it relaxes
it and returns the ferry route anyway, with no error field to notice.

Measured against the live `/api/directions`, driving from Copenhagen with
ferries banned:

| | banned-ferry result | |
| --- | --- | --- |
| Orø | 86m, 67.6 km | still on a ferry |
| Samsø | 192m, 142 km | still on a ferry |
| Fanø | 228m, 305 km | still on a ferry |
| Ærø | 225m, 242 km | still on a ferry, and 49 km longer |
| Bornholm | 242m, 165 km | still on a ferry |
| Endelave | 272m, 293 km | still on a ferry |
| Aarhus | 211m, 310 km | a real land route |

Aarhus is the case this function was written for on 6 August and it still works.
**Every genuine island was wrong**, which is every island entry this product has
drafted. The Bybjerg draft carried a "PIPELINE CONTRADICTION, FIX BEFORE
PUBLISHING" banner telling the founder to take the ferry out, and overrode the
writer's correct "1h 26min + ferry" with a road figure.

**The answer was already in the response and nothing read it.** The relaxed route
still reports `hasFerry`. So the question is not "did a route come back", it is
"does the route I was handed still cross water". Signature failure, new place.

Not the identical-route test, which was the first thing tried: **Ærø** comes back
49 km longer and still on a boat, so comparing durations would have left one
island wrong while looking like it worked.

REQUIRED rather than UNKNOWN, and `probeRelaxed` records which way it concluded,
because the rule directly above deliberately refuses to infer an island from a
failed call. This is not a failed call: Google searched, could not build a
ferry-free route, and relaxed the restriction to answer at all.

**The suite had ferry coverage and all of it passed, before and after.** Not one
case fed a probe that came back still on a ferry. The tests described the
failure modes somebody imagined; the real one was a success response.

## And the price citation points at the wrong page

Gemini also said the Bybjerg admission price was wrong. **It was not.**
`oroeminder.dk/museet/aabningstider-og-entre/` states it verbatim: *"Entré 20
kroner for personer over 12 år. Børn under 12 år i selskab med voksne har gratis
adgang."* Plus the 50 kr out-of-hours fee. The draft was right on every figure.

**What Gemini got right is that the citation names the wrong page.** The run
report says "20-20 DKK is on oroe.dk, the highest-ranked page read that states
it: `/oplev-oroe/kultur-og-sevaerdigheder`". The figure is not on that page.

The chain is visible in the run report and it starts one step earlier. Step 17,
source freshness, read `oroeminder.dk` as **about 236 months old** and kept it as
"background only". That is roughly twenty years, and the page carries a current
season and current prices, so the date detection is wrong about the one
authoritative source. Demoted, it could not carry the citation, so the price
provenance fell to the highest-ranked page it had read that contained the
number.

**A citation pointing at a page that does not state the fact is worse than no
citation**, because it is the product's whole promise wearing a receipt for
something else. Not fixed in this pass. It wants the freshness reader looked at
first, since that is the root, and then whether price provenance should refuse
rather than fall back.

Gemini's third claim, that the "little here" line is contradicted by an animal
park and two galleries on `oroe.dk`, is **unverified**: that host refused a fetch
and it has not been checked either way.

---

## How this pass was checked

The repo was mirrored into a sandbox and the suite and build were run there
rather than reasoned about, because every claim above about what a rule does is
a claim about code nobody executed while making it.

Before anything was touched:

    node tests/run.mjs     9,898 passed, 0 failed
    npx vite build         clean, 1,617.02 kB

Identical to the numbers `HANDOFF_NEXT.md` records, which is what made the
mirror trustworthy enough to check anything against. After the dash pass:

    node tests/run.mjs     9,905 passed, 0 failed
    npx vite build         clean, 1,617.00 kB

The bundle is about twenty bytes smaller, which is the eleven dashes: an em dash
is three bytes in UTF-8 and a full stop, comma or colon is one.

Two of the mirror's own quirks, for whoever repeats this: `tests/run.mjs` reads
`vercel.json`, `middleware.js`, `index.html`, `package.json` and three files in
`public/`, so a mirror of `src/` alone dies at line 2746 rather than failing an
assertion. And `og-default.jpg` has to exist as a real file, because the
assertion at line 2710 calls `statSync(...).isFile()` after a deleted og:image
tag once made the path collapse to `public/` itself and pass.
